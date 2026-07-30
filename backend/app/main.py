from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine, get_db
from .schemas import SaleCreate, SaleResult
from .services.sales import create_sale


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Conveniência para a edição SQLite local. PostgreSQL usa database/schema.sql/migrations.
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API REST multiempresa para estoque, vendas e financeiro.",
    lifespan=lifespan,
)


def request_context(
    x_organization_id: str = Header(...),
    x_operator_id: str = Header(...),
    x_permissions: str = Header(default="sales.create"),
) -> tuple[str, str]:
    # No produto final estes dados vêm do JWT e as permissões são carregadas do RBAC.
    if "sales.create" not in {item.strip() for item in x_permissions.split(",")}:
        raise HTTPException(status_code=403, detail="Permissão sales.create necessária")
    return x_organization_id, x_operator_id


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.post(
    f"{settings.api_prefix}/sales",
    response_model=SaleResult,
    status_code=201,
)
def post_sale(
    payload: SaleCreate,
    context: tuple[str, str] = Depends(request_context),
    db: Session = Depends(get_db),
) -> SaleResult:
    organization_id, operator_id = context
    sale = create_sale(db, organization_id, operator_id, payload)
    return SaleResult(
        id=sale.id,
        total=sale.total,
        status=sale.status.value,
        created_at=sale.created_at,
    )
