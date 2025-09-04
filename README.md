# ClassMate: AI-Powered Study Assistant 

## Overview

ClassMate is an intelligent study companion that leverages AI to transform the learning experience. It combines personalized study planning, resource curation, and interactive assistance to help students achieve their academic goals efficiently.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ShaheerPathan/ClassMate.git
cd ClassMate
```

2. Set up environment variables:

Create `.env` file in the root directory with the following variables:

```env
NEXTAUTH_SECRET=your-secret-key
MONGODB_URI=your-mongodb-uri
NEXTAUTH_URL=http://localhost:3000
EXPRESS_BACKEND_URL=http://backend:8000
NEXT_PUBLIC_API_URL=http://backend:8000
API_URL=http://backend:8000
GROQ_API_KEY=your-groq-api-key
GROQ_API_KEY_RAG=your-groq-rag-api-key
TAVILY_API_KEY=your-tavily-api-key
```

3. Build with Docker Compose:

```bash
docker compose build
```

4. Run with Docker Compose:

```bash
docker compose up -d
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
