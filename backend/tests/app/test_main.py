import pytest

pytestmark = pytest.mark.asyncio


async def test_health_requires_no_auth(client) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
