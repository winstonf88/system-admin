from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "products" ADD "is_active" BOOL NOT NULL DEFAULT True;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "products" DROP COLUMN "is_active";"""


MODELS_STATE = (
    "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"
    "9SIJv8J+Rim2Km9zYVn+D8pio/4="
)
