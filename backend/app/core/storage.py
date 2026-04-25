import asyncio
from pathlib import Path
from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    from app.core.config import Settings

UPLOADS_ROOT = Path("uploads")


@runtime_checkable
class StorageBackend(Protocol):
    async def save(self, key: str, data: bytes) -> str: ...

    async def delete(self, key: str) -> None: ...

    def url_to_key(self, url: str) -> str | None: ...


class LocalStorage:
    def __init__(self) -> None:
        UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)

    async def save(self, key: str, data: bytes) -> str:
        dest = UPLOADS_ROOT / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(dest.write_bytes, data)
        return f"/uploads/{key}"

    async def delete(self, key: str) -> None:
        path = UPLOADS_ROOT / key
        await asyncio.to_thread(self._unlink_if_exists, path)

    def url_to_key(self, url: str) -> str | None:
        prefix = "/uploads/"
        if url.startswith(prefix):
            return url.removeprefix(prefix)
        return None

    @staticmethod
    def _unlink_if_exists(path: Path) -> None:
        if path.is_file():
            path.unlink()


class SpacesStorage:
    def __init__(
        self,
        *,
        key: str,
        secret: str,
        region: str,
        bucket: str,
        cdn_endpoint: str | None,
    ) -> None:
        self._bucket = bucket
        # cdn_endpoint wins if set (e.g. https://mybucket.nyc3.cdn.digitaloceanspaces.com)
        # otherwise fall back to the standard Spaces endpoint
        self._base_url = (
            cdn_endpoint.rstrip("/")
            if cdn_endpoint
            else f"https://{bucket}.{region}.digitaloceanspaces.com"
        )
        self._endpoint_url = f"https://{region}.digitaloceanspaces.com"
        self._key = key
        self._secret = secret
        self._region = region

    def _client(self):
        import aioboto3

        session = aioboto3.Session(
            aws_access_key_id=self._key,
            aws_secret_access_key=self._secret,
            region_name=self._region,
        )
        return session.client("s3", endpoint_url=self._endpoint_url)

    async def save(self, key: str, data: bytes) -> str:
        async with self._client() as s3:
            await s3.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ACL="public-read",
            )
        return f"{self._base_url}/{key}"

    async def delete(self, key: str) -> None:
        async with self._client() as s3:
            await s3.delete_object(Bucket=self._bucket, Key=key)

    def url_to_key(self, url: str) -> str | None:
        prefix = f"{self._base_url}/"
        if url.startswith(prefix):
            return url.removeprefix(prefix)
        return None


def get_storage_backend(settings: "Settings") -> StorageBackend:
    if settings.storage_backend == "spaces":
        return SpacesStorage(
            key=settings.spaces_key,  # type: ignore[arg-type]
            secret=settings.spaces_secret,  # type: ignore[arg-type]
            region=settings.spaces_region,
            bucket=settings.spaces_bucket,  # type: ignore[arg-type]
            cdn_endpoint=settings.spaces_cdn_endpoint,
        )
    return LocalStorage()
