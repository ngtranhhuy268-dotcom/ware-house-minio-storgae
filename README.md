# Warehouse Hub

Ung dung quan ly kho noi bo gom:

- `Next.js` frontend
- `NestJS` API
- `PostgreSQL` + `Prisma`
- `MinIO` cho media va file Excel
- `nginx` reverse proxy
- `Docker Compose` de deploy noi bo

## Vai tro

- `Admin`: quan ly user, unit, kho, cong trinh, UOM, import/export
- `Nhan vien kho`: nhap kho, xuat kho, chinh kho, import/export Excel
- `Tho`: chi xem ton kho va chi tiet vat tu

## Tinh nang da co

- Dang nhap bang JWT access/refresh token
- Trang kho 1 man hinh voi indicator, bo loc nang cao, pagination server-side
- Drawer chi tiet vat tu va lich su giao dich
- Nhap kho, xuat kho, chinh kho
- Import Excel legacy theo file hien tai, preview loi/canh bao truoc khi commit
- Export Excel 2 sheet co nhung anh
- Trang admin de tao user, unit, kho, cong trinh va don vi tinh

## Chay bang Docker

1. Tao file `.env` tu `.env.example`
2. Dieu chinh `APP_ORIGIN` va `MINIO_PUBLIC_ENDPOINT` theo hostname/IP server noi bo
3. Chay:

```bash
docker compose up --build
```

4. Truy cap:

- App: `http://localhost:8080`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Tai khoan mac dinh

- Email: `admin@warehouse.local`
- Password: `Admin@123456`

## Import file Excel hien tai

- File mau hien co: `VẬT TƯ HÀNG HOÁ.xlsx`
- Preview import se doc:
  - Sheet `SL TON KHO` lam snapshot ton hien tai
  - Sheet `Trang tinh 1` / journal legacy lam tham chieu lich su
- Commit import chi nen thuc hien vao kho dich da chon trong UI

## Phat trien local

### API

```bash
cd apps/api
npm install
npx prisma generate
npm run build
```

### Web

```bash
cd apps/web
npm install
npm run build
```

## Ghi chu deploy

- Signed URL cho file/anh dang dung `MINIO_PUBLIC_ENDPOINT`, vi vay gia tri nay phai truy cap duoc tu browser nguoi dung.
- Compose hien mo cong `8080`, `9000`, `9001`. Neu deploy len server noi bo, co the doi mapping port o `docker-compose.yml`.
- He thong khong mo public self-register trong v1. Admin se tao tai khoan trong man hinh `/admin`.
