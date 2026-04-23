from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "users" ADD "is_superuser" BOOL NOT NULL DEFAULT False;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "users" DROP COLUMN "is_superuser";"""


MODELS_STATE = (
    "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"
    "VXmTC8vifyHAyzc="
)
