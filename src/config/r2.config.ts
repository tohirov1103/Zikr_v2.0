export const R2Config = () => ({
    r2: {
        bucket: process.env.R2_BUCKET,
        endpoint: process.env.R2_ENDPOINT,
        accessKey: process.env.R2_ACCESS_KEY,
        secretKey: process.env.R2_SECRET_KEY,
        publicUrl: process.env.R2_PUBLIC_URL,
    }
})