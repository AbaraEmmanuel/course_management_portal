// auth.js - FINAL CORRECT VERSION
const BACKEND_API_URL = 'http://localhost:8080';

export async function loginUser(email, password) {
  try {
    console.log('Logging in to:', email);
    
    const response = await fetch(`${BACKEND_API_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email,
        password: password 
      })
    });
    
    console.log('Login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
      
      // Store the token
      localStorage.setItem('authToken', data.token);
      
      // Also store user data if returned
      if (data.user) {
        localStorage.setItem('userData', JSON.stringify(data.user));
      }
      
      return { 
        success: true, 
        user: data.user,
        token: data.token
      };
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error || 'Login failed' 
      };
    }
    
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: 'Connection error. Check if backend is running.' 
    };
  }
}