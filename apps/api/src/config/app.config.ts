export function getAppConfig() {
  return {
    port: Number.parseInt(process.env.PORT ?? '3001', 10),
    appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:3000',
    accessTokenSecret:
      process.env.JWT_ACCESS_SECRET ?? 'warehouse-access-secret',
    refreshTokenSecret:
      process.env.JWT_REFRESH_SECRET ?? 'warehouse-refresh-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    minioEndpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    minioPublicEndpoint:
      process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    minioRegion: process.env.MINIO_REGION ?? 'us-east-1',
    minioAccessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    minioSecretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    minioBucket: process.env.MINIO_BUCKET ?? 'warehouse-media',
    minioForcePathStyle:
      (process.env.MINIO_FORCE_PATH_STYLE ?? 'true').toLowerCase() !== 'false',
    signedUrlTtl: Number.parseInt(
      process.env.MINIO_SIGNED_URL_TTL ?? '3600',
      10,
    ),
  };
}
