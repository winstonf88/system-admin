from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "tenants" (
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "slug" VARCHAR(80) NOT NULL UNIQUE,
    "name" VARCHAR(180) NOT NULL,
    "is_active" BOOL NOT NULL DEFAULT True,
    "config" JSONB NOT NULL,
    "api_key_hash" VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS "idx_tenants_slug_61f2b2" ON "tenants" ("slug");
CREATE INDEX IF NOT EXISTS "idx_tenants_api_key_d5b6a7" ON "tenants" ("api_key_hash");
CREATE TABLE IF NOT EXISTS "users" (
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "first_name" VARCHAR(120),
    "last_name" VARCHAR(120),
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOL NOT NULL DEFAULT True,
    "tenant_id" INT NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_users_email_133a6f" ON "users" ("email");
CREATE TABLE IF NOT EXISTS "categories" (
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" VARCHAR(120) NOT NULL,
    "sort_order" INT NOT NULL DEFAULT 0,
    "parent_id" INT REFERENCES "categories" ("id") ON DELETE RESTRICT,
    "tenant_id" INT NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_categories_tenant__a9a6b7" UNIQUE ("tenant_id", "name", "parent_id")
);
CREATE INDEX IF NOT EXISTS "uq_category_tenant_name_parent" ON "categories" ("tenant_id", "name", "parent_id");
CREATE TABLE IF NOT EXISTS "products" (
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" VARCHAR(180) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "image_url" VARCHAR(512),
    "tenant_id" INT NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_products_name_625ba0" ON "products" ("name");
CREATE TABLE IF NOT EXISTS "product_categories" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" INT NOT NULL REFERENCES "categories" ("id") ON DELETE CASCADE,
    "product_id" INT NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
    "tenant_id" INT NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_product_cat_product_01e387" UNIQUE ("product_id", "category_id")
);
CREATE TABLE IF NOT EXISTS "product_images" (
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "url" VARCHAR(512) NOT NULL,
    "sort_order" INT NOT NULL DEFAULT 0,
    "product_id" INT NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
    "tenant_id" INT NOT NULL REFERENCES "tenants" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_product_ima_product_9602e3" UNIQUE ("product_id", "tenant_id", "sort_order")
);
CREATE TABLE IF NOT EXISTS "product_variations" (
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "size" VARCHAR(64),
    "color" VARCHAR(64),
    "quantity" INT NOT NULL DEFAULT 0,
    "product_id" INT NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "eJztXW1v4jgQ/iuITz2Jq4Bru9XpdBJQesttWypK91a7WkUmMWA1JDRx2nI9/vvZzqvzBq"
    "EJEPCnlrHHsR/bYz8zE3ivznQFqubpEGpAw9XfK+9VDcwg+SdUUqtUwXzuy6kAg5HKqmJW"
    "h8nAyMQGkGlTY6CakIgUaMoGmmOka0SqWapKhbpMKiJt4ossDT1bUML6BOIpNEjBj59EjD"
    "QFvkHT/Th/ksYIqgrXV6TQZzO5hBdzJutp+JpVpE8bSbKuWjPNrzxf4KmuebWRPcYJ1KAB"
    "MKTNY8Oi3ae9cwbqjsjuqV/F7mJAR4FjYKk4MNw1MZB1jeKHKJp0gBP6lF+bjbNPZ5e/XZ"
    "xdkiqsJ57k09Ienj92W5EhcDesLlk5wMCuwWD0cZMNSAcrARzF74qUYDSD8SDymiEwFUf1"
    "1P0nDK0LZBq2rsAH119QOaFLxqD0NXXhTFwKlMPebfdh2Lq9pyOZmeazyiBqDbu0pMmki5"
    "D05OIXKtfJdrC3iddI5Z/e8HOFfqx87991GYK6iScGe6Jfb/i9SvsELKxLmv4qASWwxlyp"
    "Cwyp6U+sNVc2nFheU0zsTifW6bw/r6ZqTaIz2pkCI3423fqheSRgbTJzhZu7GXiTVKhN8J"
    "R8vKynzNvX1qDzuTU4uayH5uLOKWmyoiWHHvubAT23fj7obWHdc/g11gKwkYJgIwohMiVy"
    "uqOXGBzbuq5CoCUcukG9EJ4jolgUoN4K3QjQFPza/f4NZzPavWEIx8fbdpcAzOAllRCGwV"
    "M5cArr2hjFbOu/H/p3CaevpxE20EjGlf8qKjIj15m8EK3+MbY0mSJZGVlIxUgzT+lj/6wW"
    "gjMFgcPZXZ4nt61v4ZXbuem3w0aXNtAOIQ7mSHqCC2kKzGkWgxDW28gwOEsyBfRCzerF2R"
    "pW4eIs0SjQouWSXsXHT4FLJRWMgPz0CgxF4koCtxITGmaM4XDUrr8MoArY6KLYOnTkkTSx"
    "n8Z36S4WVxp3fsukyxPdQPCDMHTsdhYlhmJu6Iol4w8CcW+3Un4cpLyWhoPI4awQCc3AJC"
    "dUerSpkkFCLave1JNsbbRo1pyFJUAj41acZ9MnBc1pjNfHNbPJPh/PlguPj/D4CMeA8PiI"
    "iS3E4wNnAKlZOIqnUEafT/P8fA12Qmol0hNWxrO9MTJMLGV1/vBaBTG9gj1AzbU8QM0UD1"
    "Az4gFSwQZgckoCS++GC0zzVSeXuKyOiIhiOV2UhWx34aLM30VpR3ilTLduTmf15XtP1mcO"
    "9++IbyyMYxTEa92AaKJ9gQuGZY/0CWhy3EqMhOX3D8MkJkvEBnj1yBy/QMgQycCgvQA7rY"
    "dO66pbXSZ7FYtkxZ7vJIYZB/0qyeyYd+bkS5F/8MB5pyowoC38GSLR71V/3Ct1ySf4NifX"
    "V5N0zYPKYxnPrp9qITkt0SLJboBB4KzTKmuIDJt9WAoiv4EhqQkif+h8TxD5A53YCJE/su"
    "SDIuiSqRtYIqzH9k2veWbwStu7h9Z3fXYEaaZ7vK8PG6ezEWo7YOw54yZYj2A9u2A90b2b"
    "A3YZAsLb37nrgsdZJQ68ATmeB73OMI0zBk4Sa7SDVIz9wTU2zq4i7emokw+K9Cm4iSoxLo"
    "VADkuyRyGYLiNC7vt2+NUEUz90QieY+oFO7N4z9UIj7oW8JTA3kBwD4bWqgyS66WqEQBxT"
    "lT2k6CmYXfUf2zfdyv2g2+k99JzsdW95s0I+3Dbotm5CAAZ7FYFxCN8SUAyplSTQnmY5ut"
    "+GnNGIZP97yN707/5yq4dfCQgFiGkSqGQZmdJqOKWSAMvv9PNGc42dTmol7nRWJlwkwkWy"
    "exfJOiTfi1QePbGNWL/jzaYPQvECDMRGmg8cX93mSgbJFtweaRkVMVtrpRtEKjbBwnvzhF"
    "kgz47E5FYIb8kG52BNeEsOnVQLb8mBTmzSK62LbBwgpHVMLCD2FcdMoXlO6VihE8wzH+Y5"
    "96NPH6SepXwXuxaOMHOba3V8Xg5cW7cXod9jAEOWfTWCwvVRhpx4jvInszjPJbCawvmOiG"
    "LpGwdpIBtQUDlB5cSNX1C5o53YCJXLGBL7SDBs5wnqhUTDRIK6oMGCBu8vcCIAmxsLidm+"
    "woWwvgthpyTOD1QmEzkumLmazPGhVJGgvG+WryZ42qFf5wVPO9CJjX4LPPo3U4KyW7+UaY"
    "v5fF8x/33bqh5D0JLx8xQEgKzs2SK3Q4RjYh6Jx21QRVBcQXFXQScCluVnGy1oIHlajeEY"
    "TkktjVkAv45gE3u2O2spbOIFGmbsayvJ52tApZzO5EK+x5BujQwgOtXLCWCjvtZbaPWUt9"
    "DqkbfQyBNx7HcnpP6wiquy/V9WyeW8iMMvt99QiZzK2zxYlv8Dn9NbrA=="
)
