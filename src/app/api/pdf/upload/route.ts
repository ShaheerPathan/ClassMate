import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  try {
    // Get the session token
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('pdf');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    
    // Create a new FormData instance for the backend request
    const backendFormData = new FormData();
    backendFormData.append('pdf', file);

    const response = await fetch(`${apiUrl}/pdf/upload`, {
      method: 'POST',
      headers: {
        'X-User-Id': token.sub || '',
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload PDF');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error uploading PDF:', err);
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to upload PDF' },
      { status: 500 }
    );
  }
} 