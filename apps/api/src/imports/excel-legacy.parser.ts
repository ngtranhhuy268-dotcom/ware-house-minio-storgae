import { lookup as getMimeType } from 'mime-types';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import path from 'node:path/posix';

type LegacyImage = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type ParsedLegacyInventoryRow = {
  rowNumber: number;
  itemName: string;
  uom: string;
  openingQty: number;
  totalInQty: number;
  totalOutQty: number;
  currentQty: number;
  legacyStatus: string | null;
  images: LegacyImage[];
};

export type ParsedLegacyJournalRow = {
  rowNumber: number;
  date: string | null;
  itemName: string;
  projectName: string | null;
  photos: LegacyImage[];
  invoices: LegacyImage[];
};

export type ParsedLegacyWorkbook = {
  inventoryRows: ParsedLegacyInventoryRow[];
  journalRows: ParsedLegacyJournalRow[];
  errors: string[];
  warnings: string[];
};

type DrawingImage = {
  filePath: string;
  fileName: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  trimValues: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function extractText(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }

  if (!node || typeof node !== 'object') {
    return '';
  }

  const textNode = node as Record<string, unknown>;

  if (typeof textNode['#text'] === 'string') {
    return textNode['#text'];
  }

  if (typeof textNode.t === 'string') {
    return textNode.t;
  }

  if (Array.isArray(textNode.r)) {
    return textNode.r.map(extractText).join('');
  }

  if (textNode.t && typeof textNode.t === 'object') {
    return extractText(textNode.t);
  }

  return '';
}

function colToLetter(col: number) {
  let letter = '';
  let current = col + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    current = Math.floor((current - remainder) / 26);
  }

  return letter;
}

function toCellRef(col: number, row: number) {
  return `${colToLetter(col)}${row + 1}`;
}

function excelSerialToIsoDate(serialValue: string | number | undefined) {
  if (serialValue === undefined || serialValue === null || serialValue === '') {
    return null;
  }

  const serial = Number(serialValue);

  if (Number.isNaN(serial)) {
    return null;
  }

  const baseDate = new Date(Date.UTC(1899, 11, 30));
  baseDate.setUTCDate(baseDate.getUTCDate() + serial);
  return baseDate.toISOString();
}

export async function parseLegacyWorkbook(
  buffer: Buffer,
): Promise<ParsedLegacyWorkbook> {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStrings = await loadSharedStrings(zip);
  const sheetTargets = await resolveSheetTargets(zip);
  const sheetEntries = [...sheetTargets.entries()];
  const inventoryRows: ParsedLegacyInventoryRow[] = [];
  const journalRows: ParsedLegacyJournalRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const inventorySheetPath = sheetTargets.get('SL TỒN KHO') ?? sheetEntries[0]?.[1];
  const journalSheetPath = sheetTargets.get('Trang tính1') ?? sheetEntries[1]?.[1];

  if (!inventorySheetPath) {
    errors.push('Không tìm thấy sheet SL TỒN KHO');
  }

  if (!journalSheetPath) {
    errors.push('Không tìm thấy sheet Trang tính1');
  }

  if (inventorySheetPath) {
    const sheetValues = await loadSheetValues(zip, inventorySheetPath, sharedStrings);
    const imageMap = await loadSheetImages(zip, inventorySheetPath);

    for (const row of sheetValues) {
      if (row.rowNumber < 5) {
        continue;
      }

      const itemName = row.cells.B?.trim();
      if (!itemName) {
        continue;
      }

      inventoryRows.push({
        rowNumber: row.rowNumber,
        itemName,
        uom: row.cells.D?.trim() || 'CÁI',
        openingQty: Number(row.cells.E || 0),
        totalInQty: Number(row.cells.F || 0),
        totalOutQty: Number(row.cells.G || 0),
        currentQty: Number(row.cells.H || 0),
        legacyStatus: row.cells.I?.trim() || null,
        images: await resolveImagesForCells(zip, imageMap, [`C${row.rowNumber}`]),
      });
    }
  }

  if (journalSheetPath) {
    const sheetValues = await loadSheetValues(zip, journalSheetPath, sharedStrings);
    const imageMap = await loadSheetImages(zip, journalSheetPath);

    for (const row of sheetValues) {
      if (row.rowNumber < 2) {
        continue;
      }

      const itemName = row.cells.B?.trim();
      const serialDate = row.cells.A?.trim();

      if (!itemName && !serialDate) {
        continue;
      }

      journalRows.push({
        rowNumber: row.rowNumber,
        date: excelSerialToIsoDate(serialDate),
        itemName: itemName || 'Không rõ vật tư',
        projectName: row.cells.F?.trim() || null,
        photos: await resolveImagesForCells(zip, imageMap, [
          `C${row.rowNumber}`,
          `D${row.rowNumber}`,
          `E${row.rowNumber}`,
        ]),
        invoices: await resolveImagesForCells(zip, imageMap, [
          `G${row.rowNumber}`,
          `H${row.rowNumber}`,
          `I${row.rowNumber}`,
        ]),
      });
    }
  }

  if (inventoryRows.length === 0) {
    warnings.push('Sheet tồn kho không có dòng dữ liệu hợp lệ');
  }

  return {
    inventoryRows,
    journalRows,
    errors,
    warnings,
  };
}

async function loadSharedStrings(zip: JSZip) {
  const entry = zip.file('xl/sharedStrings.xml');

  if (!entry) {
    return [];
  }

  const xml = parser.parse(await entry.async('string'));
  return asArray(xml?.sst?.si).map(extractText);
}

async function resolveSheetTargets(zip: JSZip) {
  const workbookEntry = zip.file('xl/workbook.xml');
  const relsEntry = zip.file('xl/_rels/workbook.xml.rels');
  const map = new Map<string, string>();

  if (!workbookEntry || !relsEntry) {
    return map;
  }

  const workbookXml = parser.parse(await workbookEntry.async('string'));
  const relsXml = parser.parse(await relsEntry.async('string'));
  const relationships = new Map<string, string>();

  for (const relationship of asArray(relsXml.Relationships.Relationship)) {
    relationships.set(
      relationship.Id,
      normalizeExcelPath('xl', relationship.Target),
    );
  }

  for (const sheet of asArray(workbookXml.workbook.sheets.sheet)) {
    const target = relationships.get(sheet.id || sheet['r:id']);
    if (target) {
      map.set(sheet.name, target);
    }
  }

  return map;
}

async function loadSheetValues(
  zip: JSZip,
  sheetPath: string,
  sharedStrings: string[],
) {
  const sheetEntry = zip.file(sheetPath);
  if (!sheetEntry) {
    return [];
  }

  const xml = parser.parse(await sheetEntry.async('string'));
  const rows = asArray(xml?.worksheet?.sheetData?.row);

  return rows.map((row) => {
    const cells = asArray(row.c).reduce<Record<string, string>>((acc, cell) => {
      const ref = String(cell.r || '');
      const column = ref.replace(/[0-9]/g, '');

      if (!column) {
        return acc;
      }

      let value = '';
      if (cell.t === 's') {
        value = sharedStrings[Number(cell.v)] || '';
      } else if (cell.t === 'inlineStr') {
        value = extractText(cell.is);
      } else if (cell.v !== undefined && cell.v !== null) {
        value = String(cell.v);
      }

      acc[column] = value;
      return acc;
    }, {});

    return {
      rowNumber: Number(row.r),
      cells,
    };
  });
}

async function loadSheetImages(zip: JSZip, sheetPath: string) {
  const imageMap = new Map<string, DrawingImage[]>();
  const relsPath = path.join(
    path.dirname(sheetPath),
    '_rels',
    `${path.basename(sheetPath)}.rels`,
  );
  const relsEntry = zip.file(relsPath);

  if (!relsEntry) {
    return imageMap;
  }

  const relsXml = parser.parse(await relsEntry.async('string'));
  const drawingRelationship = asArray(relsXml.Relationships.Relationship).find(
    (relationship) => String(relationship.Type).includes('/drawing'),
  );

  if (!drawingRelationship) {
    return imageMap;
  }

  const drawingPath = normalizeExcelPath(
    path.dirname(sheetPath),
    drawingRelationship.Target,
  );
  const drawingEntry = zip.file(drawingPath);
  if (!drawingEntry) {
    return imageMap;
  }

  const drawingXml = parser.parse(await drawingEntry.async('string'));
  const drawingRelsPath = path.join(
    path.dirname(drawingPath),
    '_rels',
    `${path.basename(drawingPath)}.rels`,
  );
  const drawingRelsEntry = zip.file(drawingRelsPath);

  if (!drawingRelsEntry) {
    return imageMap;
  }

  const drawingRelsXml = parser.parse(await drawingRelsEntry.async('string'));
  const imageRelationships = new Map<string, string>();

  for (const relationship of asArray(drawingRelsXml.Relationships.Relationship)) {
    imageRelationships.set(
      relationship.Id,
      normalizeExcelPath(path.dirname(drawingPath), relationship.Target),
    );
  }

  for (const anchor of asArray(drawingXml.wsDr.oneCellAnchor)) {
    const relId = anchor.pic?.blipFill?.blip?.embed || anchor.pic?.blipFill?.blip?.['r:embed'];
    const filePath = imageRelationships.get(relId);

    if (!filePath) {
      continue;
    }

    const cellRef = toCellRef(Number(anchor.from.col), Number(anchor.from.row));
    const list = imageMap.get(cellRef) ?? [];
    list.push({
      filePath,
      fileName: path.basename(filePath),
    });
    imageMap.set(cellRef, list);
  }

  return imageMap;
}

async function resolveImagesForCells(
  zip: JSZip,
  imageMap: Map<string, DrawingImage[]>,
  cellRefs: string[],
) {
  const result: LegacyImage[] = [];

  for (const cellRef of cellRefs) {
    const images = imageMap.get(cellRef) ?? [];

    for (const image of images) {
      const entry = zip.file(image.filePath);
      if (!entry) {
        continue;
      }

      result.push({
        fileName: image.fileName,
        mimeType:
          (getMimeType(image.fileName) as string | false) ||
          'application/octet-stream',
        buffer: await entry.async('nodebuffer'),
      });
    }
  }

  return result;
}

function normalizeExcelPath(basePath: string, targetPath: string) {
  return path.normalize(path.join(basePath, targetPath)).replace(/^\.\//, '');
}
