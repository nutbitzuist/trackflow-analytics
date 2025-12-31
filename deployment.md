# Deployment Details

## Projects

### Backend (Railway)
*   **Project Name**: `trackflow-backend`
*   **Project ID**: `898daaca-5b62-42db-94d1-42538c2ef7a5`
*   **URL**: https://railway.com/project/898daaca-5b62-42db-94d1-42538c2ef7a5
*   **Deployment Command**:
    ```bash
    cd backend
    railway up --detach
    ```

### Frontend (Vercel)
*   **Project Name**: `frontend`
*   **Project ID**: `prj_Ihab0Sa4nxmLotd6TXbnwkhKfUNT`
*   **Deployment Command**:
    ```bash
    cd frontend
    vercel --prod
    ```

## GitHub Repository
*   **URL**: https://github.com/nutbitzuist/trackflow-analytics

## Deployment Workflow
To deploy updates, run the following commands from the project root:

1.  **Backend Updates**:
    ```bash
    cd backend
    railway up --detach
    ```

2.  **Frontend Updates**:
    ```bash
    cd frontend
    vercel --prod
    ```
