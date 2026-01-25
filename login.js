// login.js - Handles the login form
import { loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.querySelector('.btn-text');
  const btnSpinner = document.querySelector('.btn-spinner');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');

  // Toggle password visibility
  const passwordToggle = document.getElementById('passwordToggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.innerHTML = type === 'password' ? 
        '<i class="fas fa-eye"></i>' : 
        '<i class="fas fa-eye-slash"></i>';
    });
  }

  // Form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Basic validation
    if (!email || !password) {
      showError('Please fill in all fields.');
      return;
    }
    
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    
    // Show loading state
    setLoadingState(true);
    hideError();
    
    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        // Login successful - redirect to admin page
        
        window.location.href = 'content-manager.html';
      } else {
        showError(result.error);
      }
    } catch (error) {
      console.error('Login handler error:', error);
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setLoadingState(false);
    }
  });

  function setLoadingState(loading) {
    if (loading) {
      loginBtn.disabled = true;
      btnText.style.opacity = '0';
      btnSpinner.style.display = 'flex';
    } else {
      loginBtn.disabled = false;
      btnText.style.opacity = '1';
      btnSpinner.style.display = 'none';
    }
  }

  function showError(message) {
    if (errorMessage && errorText) {
      errorText.textContent = message;
      errorMessage.style.display = 'flex';
    } else {
      // Fallback alert
      alert('Error: ' + message);
    }
  }

  function hideError() {
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});