from tortoise import fields, models


class TimestampMixin:
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


class BaseModel(TimestampMixin, models.Model):
    class Meta:
        abstract = True
