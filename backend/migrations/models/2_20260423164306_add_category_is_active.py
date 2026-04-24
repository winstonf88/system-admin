from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "categories" ADD "is_active" BOOL NOT NULL DEFAULT True;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "categories" DROP COLUMN "is_active";"""


MODELS_STATE = (
    "eJztXWtv4jgU/SuIT12JrVq27VSr1UpA6Q47bakonR3NaBSZxIDVkKSJ05bt8t/Xdp7OC0"
    "ITIOBPLbavEx/b1z7H1/Ben+kKVK3jIdSAhuu/197rGphB8k8kp1GrA8MI0mkCBiOVFcWs"
    "DEsDIwubQKZVjYFqQZKkQEs2kYGRrpFUzVZVmqjLpCDSJkGSraFnG0pYn0A8hSbJ+PGTJC"
    "NNgW/Q8j4aT9IYQVXh3hUp9NksXcJzg6X1NHzNCtKnjSRZV+2ZFhQ25niqa35p5LRxAjVo"
    "Agxp9di06evTt3Mb6rXIedOgiPOKIRsFjoGt4lBzV8RA1jWKH6Jo0gZO6FN+bZ6efTq7/O"
    "3i7JIUYW/ip3xaOM0L2u4YMgTuhvUFywcYOCUYjAFusglpYyWA4/hdkRyMZjAZRN4yAqbi"
    "mh57/0Sh9YDMwtZLCMANBlRB6JI2KH1NnbsdlwHlsHfbfRi2bu9pS2aW9awyiFrDLs1pst"
    "R5JPXo4hearpPp4EwTv5LaP73h5xr9WPvev+syBHULT0z2xKDc8HudvhOwsS5p+qsElNAY"
    "81I9YEjJoGNtQ1mzY3lL0bFb7Vj35YN+tVR7Eu/RzhSYyb3plY/0IwFrnZ4r3d3NwJukQm"
    "2Cp+Tj5UlGv31tDTqfW4Ojy5NIX9y5OU2WteDQY39zoOeVLwa9DYx7Dr/TlQA8zUDwNA4h"
    "siSyuqOXBBzbuq5CoKUsumG7CJ4jYlgWoP4IXQvQDPza/f4N5zPavWEEx8fbdpcAzOAlhR"
    "CG4VU5tArr2hglTOu/H/p3KauvbxF10EjGtf9qKrJi25miEK3/MbY1mSJZG9lIxUizjulj"
    "/6yXgjMFgcPZG55Ht61v0ZHbuem3o06XVtCOIA4MJD3BuTQF1jSPQ4jareUY3CGZAXqpbv"
    "XibAWvcHGW6hRo1mJBt+Ljp9CmkiaMgPz0CkxF4nJCuxILmlaC43DNrr8MoApY6+LYunTk"
    "kVSxm8534Q0WLzVp/ZbJK090E8EPwtBx6plXGArD1BVbxh8E4t6ppfo4SEUNDReR/RkhEp"
    "qBSUGo9GhVFYOEela9qaf52njWrDmLpgCNtFtxn02fFHanCaqP52bTNR/flwvFRyg+QhgQ"
    "io/o2FIUHzgDSM3DUXyDKmo+zfPzFdgJKZVKT1gez/bGyLSwlFf84a1KYnolK0DNlRSgZo"
    "YC1IwpQCpYA0zOSGDp73CBZb3qZBOXV4iIGVZToixluguJsniJkmBj2QY0bZcX5IOVM90g"
    "snn5yFagdQ7PpVyEhrNZzmt2ZOoXQG1ismMUxziI17oJ0UT7AucMyx55J6DJSZM8FvGwex"
    "imiQQk2QSvPk/mBwhpImkYdAZgp/XQaV1164t0wbZMwcGXpRJEh7BklS488DpZserDDx44"
    "f8MCTOgk/ozoE+/1oN1Lbckn+GYQZmCRV/Oh8gncsycBziW3JpolORUwCNxxWmcVkWazDw"
    "uhkazhSBpCI9l3Ki00kj3t2JhGcmBxHWUwUUs3sUQIZdL2PnXN4I02tw892fbaIchmmYwo"
    "2DKtPhQ5m7VG4hYEpoLHomCSgklug0nG524B2OWIX9j8zF0VPM4rceANyJZn0OsMs3h4aH"
    "W2R1uIHNodXBPDQlSkPR10rEyZOo0XV5Ug04RCrtJVmnB0l4gQ2bXFryHUj30nyUL92NOO"
    "3Xn1o9QAkVIutRgmkhMgvFZ1kEY3PYsIiGNqsoOyRwZmV/3H9k23dj/odnoPPfeyhT+8WS"
    "ZP2Afd1k0EwPBbxWAcwrcUFCNmFYkLyfIc3W9DzmnELqv4yN707/7yikdvsEQkJhqzLNlm"
    "rigwzqgiwPIz/fy0ucJMJ6VSZzrLExKJkEi2L5GsQvL909+DJ7Yx73e4lz/CULwAE7GWFg"
    "PHV6+6ikGyAdkjK0olYWotlUGkcoNW/ItSzAP5fiQhXkWoJWusgw2hluw7qRZqyZ52bNoN"
    "7Hk+DhCxOiQWkHgjN9fRPGd0qNAJ5lkM8zSC06cPUs9KfnVAI3rCzE2u5efzcmjburkT+h"
    "0GMOLZlyMopI8q3DPgKH86i/MlgeUULhAiyqVvHKShCEtB5QSVEzt+QeUOtmNjVC7nkdhH"
    "DsO2HvRfymmYCPoXNFjQ4N0FThzAFsZCEqavkBBWlxC2SuKCg8p0IscdZi4nc/xRqghQ3j"
    "XP1xA8bd+384Kn7WnHxn+0AP2bK0DZK1/JsMVivl6b/3p4VU8gaOn4+QYCQJb3bJPdIcIJ"
    "Zx6py23YRFBcQXGXQScOLKvPNlrQRPK0nsAx3JxGFrMAQRnBJnZsdjYy2MQLNK3Eayvp62"
    "vIpJpicilfu0mnRg4Q3eLVBPD0ZKVbaCcZt9BOYrfQyBNx4ncnZP4OkGey+R8CKmS9SMKv"
    "sJ/8ia3Km1xYFv8Dqo03og=="
)
