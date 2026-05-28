// auth.js - Frontend (NO usar require)
// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log(' auth.js cargado');
    
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        console.log(' Formulario encontrado');
        
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            console.log(' Enviando formulario...');
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Validar campos
            if (!email || !password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Por favor complete todos los campos';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            // Mostrar loading
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Cargando...';
            submitBtn.disabled = true;
            if (errorDiv) errorDiv.style.display = 'none';
            
            try {
                // Llamar al backend
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                console.log(' Respuesta recibida:', response.status);
                
                const data = await response.json();
                console.log(' Datos:', data);
                
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify({
                        id: data.user.id,
                        nombre: data.user.nombre,
                        email: data.user.email,
                        rol: data.user.rol,
                        avatar_url: data.user.avatar_url || null,
                        telefono: data.user.telefono || '',
                        area_departamento: data.user.area_departamento || ''
                    }));
                    window.location.href = 'dashboard.html';
                
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = data.message || 'Credenciales inválidas';
                        errorDiv.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error(' Error:', error);
                if (errorDiv) {
                    errorDiv.textContent = 'Error de conexión con el servidor. Asegúrate que el backend esté corriendo en http://localhost:5000';
                    errorDiv.style.display = 'block';
                }
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    } else {
        console.error(' No se encontró el formulario con id="loginForm"');
    }
    
    // Verificar si ya hay sesión activa
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('login.html')) {
        console.log(' Sesión existente, redirigiendo...');
        window.location.href = 'dashboard.html';
    }
});