@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM  Splito - Expense Sharing App Launcher
REM  Handles: prerequisite checks, Docker services, database setup, dev server
REM ============================================================================

title Splito - Expense Sharing App

REM --- Change to script directory so paths work regardless of where it's called from ---
cd /d "%~dp0"

echo.
echo ============================================
echo   Splito - Expense Sharing App Launcher
echo ============================================
echo.

REM ============================================================================
REM  STEP 1: Check Node.js
REM ============================================================================
echo [1/7] Checking Node.js...

where node >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    echo.
    goto :fail
)

REM Check Node.js version (need 18+)
for /f "tokens=1 delims=v" %%v in ('node -v') do set "NODE_VER_RAW=%%v"
for /f "tokens=1 delims=." %%m in ('node -v') do set "NODE_MAJOR=%%m"
set "NODE_MAJOR=!NODE_MAJOR:v=!"

if !NODE_MAJOR! LSS 18 (
    echo.
    echo ERROR: Node.js 18+ is required. You have v!NODE_VER_RAW!.
    echo Please upgrade from https://nodejs.org/
    echo.
    goto :fail
)
echo        Node.js v!NODE_VER_RAW! - OK

REM ============================================================================
REM  STEP 2: Check npm
REM ============================================================================
echo [2/7] Checking npm...

where npm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: npm is not installed or not in PATH.
    echo npm ships with Node.js - please reinstall Node.js from https://nodejs.org/
    echo.
    goto :fail
)

for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
echo        npm v!NPM_VER! - OK

REM ============================================================================
REM  STEP 3: Check Docker
REM ============================================================================
echo [3/7] Checking Docker...

where docker >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    echo.
    goto :fail
)

REM Check if Docker daemon is running
docker info >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: Docker daemon is not running.
    echo Please start Docker Desktop and wait for it to fully load, then re-run this script.
    echo.
    goto :fail
)
echo        Docker - OK

REM Also check docker-compose / docker compose
docker compose version >nul 2>&1
if !ERRORLEVEL! neq 0 (
    docker-compose version >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo.
        echo ERROR: Docker Compose is not available.
        echo Please ensure Docker Desktop is up to date ^(it includes Docker Compose^).
        echo.
        goto :fail
    )
    set "COMPOSE_CMD=docker-compose"
) else (
    set "COMPOSE_CMD=docker compose"
)
echo        Docker Compose - OK

REM ============================================================================
REM  STEP 4: Check .env file
REM ============================================================================
echo [4/7] Checking environment configuration...

if not exist ".env" (
    echo.
    echo WARNING: .env file not found.
    echo Creating .env with default development values...
    (
        echo # Database
        echo DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_sharing?schema=public"
        echo.
        echo # Redis
        echo REDIS_URL="redis://localhost:6379"
        echo.
        echo # JWT
        echo JWT_SECRET="your-super-secret-jwt-key-change-in-production"
        echo JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
        echo.
        echo # Next.js
        echo NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"
        echo NEXTAUTH_URL="http://localhost:3000"
        echo.
        echo # External APIs ^(to be configured later^)
        echo CURRENCY_API_KEY=""
        echo EMAIL_SERVICE_API_KEY=""
    ) > .env
    echo        .env created with defaults - OK
) else (
    echo        .env exists - OK
)

REM ============================================================================
REM  STEP 5: Install npm dependencies
REM ============================================================================
echo [5/7] Checking npm dependencies...

if not exist "node_modules" (
    echo        node_modules not found. Running npm install...
    echo.
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo.
        echo ERROR: npm install failed. Check the output above for details.
        echo Common fixes:
        echo   - Delete node_modules and package-lock.json, then re-run this script
        echo   - Check your internet connection
        echo   - Try: npm cache clean --force
        echo.
        goto :fail
    )
    echo.
    echo        Dependencies installed - OK
) else (
    echo        node_modules found - OK
)

REM ============================================================================
REM  STEP 6: Start Docker services (PostgreSQL + Redis)
REM ============================================================================
echo [6/7] Starting Docker services (PostgreSQL + Redis)...

!COMPOSE_CMD! up -d
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: Failed to start Docker services.
    echo Common fixes:
    echo   - Make sure Docker Desktop is running
    echo   - Check if ports 5432 ^(PostgreSQL^) or 6379 ^(Redis^) are already in use
    echo   - Run: !COMPOSE_CMD! logs   to see detailed errors
    echo   - Run: !COMPOSE_CMD! down   then re-run this script
    echo.
    goto :fail
)

REM Wait for PostgreSQL to be ready (up to 30 seconds)
echo        Waiting for PostgreSQL to be ready...
set "PG_READY=0"
for /l %%i in (1,1,30) do (
    if !PG_READY! equ 0 (
        docker exec expense-sharing-postgres pg_isready -U postgres >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "PG_READY=1"
        ) else (
            timeout /t 1 /nobreak >nul 2>&1
        )
    )
)

if !PG_READY! equ 0 (
    echo.
    echo ERROR: PostgreSQL did not become ready within 30 seconds.
    echo Run: !COMPOSE_CMD! logs postgres   to check for issues.
    echo.
    goto :fail
)
echo        PostgreSQL - ready

REM Wait for Redis to be ready (up to 15 seconds)
echo        Waiting for Redis to be ready...
set "REDIS_READY=0"
for /l %%i in (1,1,15) do (
    if !REDIS_READY! equ 0 (
        docker exec expense-sharing-redis redis-cli ping >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "REDIS_READY=1"
        ) else (
            timeout /t 1 /nobreak >nul 2>&1
        )
    )
)

if !REDIS_READY! equ 0 (
    echo.
    echo ERROR: Redis did not become ready within 15 seconds.
    echo Run: !COMPOSE_CMD! logs redis   to check for issues.
    echo.
    goto :fail
)
echo        Redis - ready

REM ============================================================================
REM  STEP 7: Generate Prisma client and run migrations
REM ============================================================================
echo [7/7] Setting up database...

echo        Generating Prisma client...
call npx prisma generate
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: Prisma client generation failed.
    echo Make sure prisma/schema.prisma exists and is valid.
    echo.
    goto :fail
)

echo        Running database migrations...
call npx prisma migrate deploy
if !ERRORLEVEL! neq 0 (
    echo.
    echo WARNING: prisma migrate deploy failed. Trying prisma db push instead...
    call npx prisma db push
    if !ERRORLEVEL! neq 0 (
        echo.
        echo ERROR: Database setup failed.
        echo Common fixes:
        echo   - Check that PostgreSQL is running: !COMPOSE_CMD! ps
        echo   - Verify DATABASE_URL in .env matches docker-compose.yml settings
        echo   - Try: !COMPOSE_CMD! down -v   then re-run this script ^(WARNING: this deletes data^)
        echo.
        goto :fail
    )
)
echo        Database - ready

REM ============================================================================
REM  ALL CHECKS PASSED - Start the dev server
REM ============================================================================
echo.
echo ============================================
echo   All checks passed! Starting dev server...
echo ============================================
echo.
echo   App will be available at: http://localhost:3000
echo   Press Ctrl+C to stop the server.
echo.

call npm run dev

REM If we get here, the dev server was stopped
echo.
echo Dev server stopped.
echo.

set /p SHUTDOWN="Shut down Docker services? (y/N): "
if /i "!SHUTDOWN!"=="y" (
    echo Stopping Docker services...
    !COMPOSE_CMD! down
    echo Docker services stopped.
) else (
    echo Docker services left running. Stop them later with: !COMPOSE_CMD! down
)

goto :end

REM ============================================================================
REM  FAILURE EXIT
REM ============================================================================
:fail
echo.
echo ============================================
echo   Setup failed. Please fix the errors above
echo   and re-run this script.
echo ============================================
echo.
pause
exit /b 1

:end
endlocal
