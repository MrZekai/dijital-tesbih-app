from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# NOTE: This app (Zikirhane) is fully offline. The mobile client stores everything
# in AsyncStorage on the device and never calls the backend. The FastAPI server is
# kept only as a minimal, read-only health endpoint. All previous unauthenticated
# write routes and MongoDB usage have been removed to eliminate the shadow attack
# surface flagged in the security audit (SEC-001).

app = FastAPI(
    title="Zikirhane API",
    description="Read-only health endpoint. This app stores all user data on-device.",
    version="1.0.0",
    docs_url=None,       # Disable /docs
    redoc_url=None,      # Disable /redoc
    openapi_url=None,    # Disable /openapi.json
)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"status": "ok"}


app.include_router(api_router)

# Lock down CORS. The mobile app never calls this backend, so no browser origin
# is legitimately allowed. Keep an empty allow-list rather than "*".
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=[],
    allow_methods=["GET"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
