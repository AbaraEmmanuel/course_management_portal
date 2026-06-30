// At the top of content-manager.js
const API_URL = 'https://jaromind.onrender.com'; // Your Go backend
let authToken = localStorage.getItem('authToken');
let editingCourseId = null;

// Course content storage
let courseLessons = [];
let courseQuizzes = [];
let courseAssignments = [];

// User levels configuration
const USER_LEVELS = {
    SPARK: { 
        name: 'SPARK', 
        label: 'SPARK',
        priority: 1, 
        color: '#32cd32',
        icon: '⚡'
    },
    PRIME: { 
        name: 'PRIME', 
        label: 'PRIME 🔒',
        priority: 2, 
        color: '#667eea',
        icon: '👑'
    },
    APEX: { 
        name: 'APEX', 
        label: 'APEX 🔒',
        priority: 3, 
        color: '#c42e00',
        icon: '💎'
    }
};

// Check authentication on page load
if (!authToken) {
    window.location.href = 'index.html';
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load user info if available
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.name || user.email;
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Initialize dashboard and courses
    loadDashboardStats();
    loadCourses();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Move quiz/assignment event listeners inside setupEventListeners
    setupQuizEventListeners();
    setupAssignmentEventListeners();
});

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all authentication data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Reset global variables
        authToken = null;
        editingCourseId = null;
        courseLessons = [];
        courseQuizzes = [];
        courseAssignments = [];
        
        // Show logout message
        showMessage('Logged out successfully', 'success');
        
        // Redirect to login page after a brief delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const targetContent = document.querySelector(`[data-content="${tabName}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Course type handler
    const courseTypeElement = document.getElementById('courseType');
    if (courseTypeElement) {
        courseTypeElement.addEventListener('change', function() {
            const classLevelGroup = document.getElementById('classLevelGroup');
            const subjectGroup = document.getElementById('subjectGroup');
            
            if (classLevelGroup && subjectGroup) {
                if (this.value === 'class') {
                    classLevelGroup.style.display = 'block';
                    subjectGroup.style.display = 'none';
                } else if (this.value === 'subject') {
                    classLevelGroup.style.display = 'none';
                    subjectGroup.style.display = 'block';
                }
            }
        });
    }

    // Access level change handler - show/hide required levels
    const accessLevel = document.getElementById('accessLevel');
    if (accessLevel) {
        accessLevel.addEventListener('change', function() {
            const requiredLevelsGroup = document.getElementById('requiredLevelsGroup');
            if (requiredLevelsGroup) {
                if (this.value === 'premium') {
                    requiredLevelsGroup.style.display = 'block';
                } else {
                    requiredLevelsGroup.style.display = 'none';
                }
            }
        });
    }

    // === LESSON MANAGEMENT ===
    const addLessonBtn = document.getElementById('addLessonBtn');
    if (addLessonBtn) {
        addLessonBtn.addEventListener('click', () => {
            window.editingLessonIndex = null;
            const lessonModalTitle = document.getElementById('lessonModalTitle');
            if (lessonModalTitle) {
                lessonModalTitle.textContent = 'Add New Lesson';
            }
            clearLessonForm();
            const lessonModal = document.getElementById('lessonModal');
            if (lessonModal) {
                lessonModal.classList.add('show');
            }
        });
    }

    const closeLessonModal = document.getElementById('closeLessonModal');
    if (closeLessonModal) {
        closeLessonModal.addEventListener('click', () => {
            const lessonModal = document.getElementById('lessonModal');
            if (lessonModal) {
                lessonModal.classList.remove('show');
            }
        });
    }

    const cancelLesson = document.getElementById('cancelLesson');
    if (cancelLesson) {
        cancelLesson.addEventListener('click', () => {
            const lessonModal = document.getElementById('lessonModal');
            if (lessonModal) {
                lessonModal.classList.remove('show');
            }
        });
    }

    const saveLesson = document.getElementById('saveLesson');
    if (saveLesson) {
        saveLesson.addEventListener('click', () => {
            const lessonTitle = document.getElementById('lessonTitle');
            const lessonDescription = document.getElementById('lessonDescription');
            const lessonDuration = document.getElementById('lessonDuration');
            const lessonOrder = document.getElementById('lessonOrder');
            const lessonVideoUrl = document.getElementById('lessonVideoUrl');
            const lessonContent = document.getElementById('lessonContent');
            const lessonResources = document.getElementById('lessonResources');
            const lessonIsFree = document.getElementById('lessonIsFree');
            
            if (!lessonTitle || !lessonTitle.value) {
                showMessage('Please enter a lesson title', 'error');
                return;
            }
            
            const lesson = {
                title: lessonTitle.value,
                description: lessonDescription ? lessonDescription.value : '',
                duration: lessonDuration ? lessonDuration.value : '',
                order: lessonOrder ? parseInt(lessonOrder.value) : courseLessons.length + 1,
                videoUrl: lessonVideoUrl ? lessonVideoUrl.value : '',
                content: lessonContent ? lessonContent.value : '',
                resources: lessonResources ? lessonResources.value.split(',').map(r => r.trim()).filter(Boolean) : [],
                isFree: lessonIsFree ? lessonIsFree.checked : false
            };
            
            if (window.editingLessonIndex !== null) {
                courseLessons[window.editingLessonIndex] = lesson;
            } else {
                courseLessons.push(lesson);
            }
            
            renderLessons();
            const lessonModal = document.getElementById('lessonModal');
            if (lessonModal) {
                lessonModal.classList.remove('show');
            }
            showMessage('Lesson saved!', 'success');
        });
    }

    // Reset form
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset form and clear all content?')) {
                resetForm();
            }
        });
    }

    // Preview
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const data = buildCourseData();
            console.log('Course Preview:', data);
            alert('Course data logged to console (F12)');
        });
    }

    // Course form submission
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', handleCourseSubmit);
    }
}

function setupQuizEventListeners() {
    const addQuizBtn = document.getElementById('addQuizBtn');
    if (addQuizBtn) {
        addQuizBtn.addEventListener('click', () => {
            window.editingQuizIndex = null;
            window.currentQuizQuestions = [];
            const quizModalTitle = document.getElementById('quizModalTitle');
            if (quizModalTitle) {
                quizModalTitle.textContent = 'Add New Quiz';
            }
            clearQuizForm();
            const quizModal = document.getElementById('quizModal');
            if (quizModal) {
                quizModal.classList.add('show');
            }
        });
    }

    const closeQuizModal = document.getElementById('closeQuizModal');
    if (closeQuizModal) {
        closeQuizModal.addEventListener('click', () => {
            const quizModal = document.getElementById('quizModal');
            if (quizModal) {
                quizModal.classList.remove('show');
            }
        });
    }

    const cancelQuiz = document.getElementById('cancelQuiz');
    if (cancelQuiz) {
        cancelQuiz.addEventListener('click', () => {
            const quizModal = document.getElementById('quizModal');
            if (quizModal) {
                quizModal.classList.remove('show');
            }
        });
    }

    const addQuestionBtn = document.getElementById('addQuestionBtn');
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', () => {
            if (!window.currentQuizQuestions) {
                window.currentQuizQuestions = [];
            }
            const question = {
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                points: 1
            };
            window.currentQuizQuestions.push(question);
            renderQuizQuestions();
        });
    }

    const saveQuiz = document.getElementById('saveQuiz');
    if (saveQuiz) {
        saveQuiz.addEventListener('click', () => {
            const quizTitle = document.getElementById('quizTitle');
            const quizDuration = document.getElementById('quizDuration');
            const quizPassingScore = document.getElementById('quizPassingScore');
            const quizInstructions = document.getElementById('quizInstructions');
            
            if (!quizTitle || !quizTitle.value) {
                showMessage('Please enter a quiz title', 'error');
                return;
            }
            
            if (!window.currentQuizQuestions || window.currentQuizQuestions.length === 0) {
                showMessage('Please add at least one question', 'error');
                return;
            }
            
            const quiz = {
                title: quizTitle.value,
                duration: quizDuration ? parseInt(quizDuration.value) || 30 : 30,
                passingScore: quizPassingScore ? parseInt(quizPassingScore.value) || 70 : 70,
                instructions: quizInstructions ? quizInstructions.value : '',
                questions: window.currentQuizQuestions || []
            };
            
            if (window.editingQuizIndex !== null) {
                courseQuizzes[window.editingQuizIndex] = quiz;
            } else {
                courseQuizzes.push(quiz);
            }
            
            renderQuizzes();
            const quizModal = document.getElementById('quizModal');
            if (quizModal) {
                quizModal.classList.remove('show');
            }
            showMessage('Quiz saved!', 'success');
        });
    }
}

function setupAssignmentEventListeners() {
    const addAssignmentBtn = document.getElementById('addAssignmentBtn');
    if (addAssignmentBtn) {
        addAssignmentBtn.addEventListener('click', () => {
            window.editingAssignmentIndex = null;
            const assignmentModalTitle = document.getElementById('assignmentModalTitle');
            if (assignmentModalTitle) {
                assignmentModalTitle.textContent = 'Add New Assignment';
            }
            clearAssignmentForm();
            const assignmentModal = document.getElementById('assignmentModal');
            if (assignmentModal) {
                assignmentModal.classList.add('show');
            }
        });
    }

    const closeAssignmentModal = document.getElementById('closeAssignmentModal');
    if (closeAssignmentModal) {
        closeAssignmentModal.addEventListener('click', () => {
            const assignmentModal = document.getElementById('assignmentModal');
            if (assignmentModal) {
                assignmentModal.classList.remove('show');
            }
        });
    }

    const cancelAssignment = document.getElementById('cancelAssignment');
    if (cancelAssignment) {
        cancelAssignment.addEventListener('click', () => {
            const assignmentModal = document.getElementById('assignmentModal');
            if (assignmentModal) {
                assignmentModal.classList.remove('show');
            }
        });
    }

    const saveAssignment = document.getElementById('saveAssignment');
    if (saveAssignment) {
        saveAssignment.addEventListener('click', () => {
            const assignmentTitle = document.getElementById('assignmentTitle');
            const assignmentDescription = document.getElementById('assignmentDescription');
            const assignmentDueDate = document.getElementById('assignmentDueDate');
            const assignmentPoints = document.getElementById('assignmentPoints');
            const assignmentType = document.getElementById('assignmentType');
            const assignmentResources = document.getElementById('assignmentResources');
            const assignmentAllowLate = document.getElementById('assignmentAllowLate');
            
            if (!assignmentTitle || !assignmentTitle.value) {
                showMessage('Please enter an assignment title', 'error');
                return;
            }
            
            const assignment = {
                title: assignmentTitle.value,
                description: assignmentDescription ? assignmentDescription.value : '',
                dueDate: assignmentDueDate ? assignmentDueDate.value : '',
                points: assignmentPoints ? parseInt(assignmentPoints.value) || 100 : 100,
                type: assignmentType ? assignmentType.value : 'essay',
                resources: assignmentResources ? assignmentResources.value.split(',').map(r => r.trim()).filter(Boolean) : [],
                allowLate: assignmentAllowLate ? assignmentAllowLate.checked : false
            };
            
            if (window.editingAssignmentIndex !== null) {
                courseAssignments[window.editingAssignmentIndex] = assignment;
            } else {
                courseAssignments.push(assignment);
            }
            
            renderAssignments();
            const assignmentModal = document.getElementById('assignmentModal');
            if (assignmentModal) {
                assignmentModal.classList.remove('show');
            }
            showMessage('Assignment saved!', 'success');
        });
    }
}

// Global functions
window.editLesson = function(index) {
    window.editingLessonIndex = index;
    const lesson = courseLessons[index];
    
    const lessonModalTitle = document.getElementById('lessonModalTitle');
    if (lessonModalTitle) {
        lessonModalTitle.textContent = 'Edit Lesson';
    }
    
    const lessonTitle = document.getElementById('lessonTitle');
    const lessonDescription = document.getElementById('lessonDescription');
    const lessonDuration = document.getElementById('lessonDuration');
    const lessonOrder = document.getElementById('lessonOrder');
    const lessonVideoUrl = document.getElementById('lessonVideoUrl');
    const lessonContent = document.getElementById('lessonContent');
    const lessonResources = document.getElementById('lessonResources');
    const lessonIsFree = document.getElementById('lessonIsFree');
    
    if (lessonTitle) lessonTitle.value = lesson.title || '';
    if (lessonDescription) lessonDescription.value = lesson.description || '';
    if (lessonDuration) lessonDuration.value = lesson.duration || '';
    if (lessonOrder) lessonOrder.value = lesson.order || index + 1;
    if (lessonVideoUrl) lessonVideoUrl.value = lesson.videoUrl || '';
    if (lessonContent) lessonContent.value = lesson.content || '';
    if (lessonResources) lessonResources.value = (lesson.resources || []).join(', ');
    if (lessonIsFree) lessonIsFree.checked = lesson.isFree || false;
    
    const lessonModal = document.getElementById('lessonModal');
    if (lessonModal) {
        lessonModal.classList.add('show');
    }
};

window.deleteLesson = function(index) {
    if (confirm('Delete this lesson?')) {
        courseLessons.splice(index, 1);
        renderLessons();
        showMessage('Lesson deleted', 'success');
    }
};

window.updateQuestion = function(index, field, value) {
    if (window.currentQuizQuestions && window.currentQuizQuestions[index]) {
        window.currentQuizQuestions[index][field] = value;
    }
};

window.updateQuestionOption = function(index, optIndex, value) {
    if (window.currentQuizQuestions && window.currentQuizQuestions[index]) {
        window.currentQuizQuestions[index].options[optIndex] = value;
    }
};

window.deleteQuestion = function(index) {
    if (window.currentQuizQuestions) {
        window.currentQuizQuestions.splice(index, 1);
        renderQuizQuestions();
    }
};

window.editQuiz = function(index) {
    window.editingQuizIndex = index;
    const quiz = courseQuizzes[index];
    window.currentQuizQuestions = [...(quiz.questions || [])];
    
    const quizModalTitle = document.getElementById('quizModalTitle');
    if (quizModalTitle) {
        quizModalTitle.textContent = 'Edit Quiz';
    }
    
    const quizTitle = document.getElementById('quizTitle');
    const quizDuration = document.getElementById('quizDuration');
    const quizPassingScore = document.getElementById('quizPassingScore');
    const quizInstructions = document.getElementById('quizInstructions');
    
    if (quizTitle) quizTitle.value = quiz.title || '';
    if (quizDuration) quizDuration.value = quiz.duration || 30;
    if (quizPassingScore) quizPassingScore.value = quiz.passingScore || 70;
    if (quizInstructions) quizInstructions.value = quiz.instructions || '';
    
    renderQuizQuestions();
    const quizModal = document.getElementById('quizModal');
    if (quizModal) {
        quizModal.classList.add('show');
    }
};

window.deleteQuiz = function(index) {
    if (confirm('Delete this quiz?')) {
        courseQuizzes.splice(index, 1);
        renderQuizzes();
        showMessage('Quiz deleted', 'success');
    }
};

window.editAssignment = function(index) {
    window.editingAssignmentIndex = index;
    const assignment = courseAssignments[index];
    
    const assignmentModalTitle = document.getElementById('assignmentModalTitle');
    if (assignmentModalTitle) {
        assignmentModalTitle.textContent = 'Edit Assignment';
    }
    
    const assignmentTitle = document.getElementById('assignmentTitle');
    const assignmentDescription = document.getElementById('assignmentDescription');
    const assignmentDueDate = document.getElementById('assignmentDueDate');
    const assignmentPoints = document.getElementById('assignmentPoints');
    const assignmentType = document.getElementById('assignmentType');
    const assignmentResources = document.getElementById('assignmentResources');
    const assignmentAllowLate = document.getElementById('assignmentAllowLate');
    
    if (assignmentTitle) assignmentTitle.value = assignment.title || '';
    if (assignmentDescription) assignmentDescription.value = assignment.description || '';
    if (assignmentDueDate) assignmentDueDate.value = assignment.dueDate || '';
    if (assignmentPoints) assignmentPoints.value = assignment.points || 100;
    if (assignmentType) assignmentType.value = assignment.type || 'essay';
    if (assignmentResources) assignmentResources.value = (assignment.resources || []).join(', ');
    if (assignmentAllowLate) assignmentAllowLate.checked = assignment.allowLate || false;
    
    const assignmentModal = document.getElementById('assignmentModal');
    if (assignmentModal) {
        assignmentModal.classList.add('show');
    }
};

window.deleteAssignment = function(index) {
    if (confirm('Delete this assignment?')) {
        courseAssignments.splice(index, 1);
        renderAssignments();
        showMessage('Assignment deleted', 'success');
    }
};

window.editCourse = async function(courseId) {
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateFormWithCourse(data.course || data);
            editingCourseId = courseId;
            const submitText = document.getElementById('submitText');
            if (submitText) {
                submitText.textContent = 'Update Course';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        showMessage('Error loading course', 'error');
    }
};

window.deleteCourse = async function(courseId) {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            showMessage('Course deleted', 'success');
            await loadCourses();
            await loadDashboardStats();
        }
    } catch (error) {
        showMessage('Error deleting course', 'error');
    }
};

// Helper function to get selected required levels
function getSelectedRequiredLevels() {
    const checkboxes = document.querySelectorAll('input[name="requiredLevels"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function renderLessons() {
    const container = document.getElementById('lessonsContainer');
    if (!container) return;
    
    if (courseLessons.length === 0) {
        container.innerHTML = `
            <div class="empty-state-content">
                <i class="fas fa-book-reader"></i>
                <p>No lessons added yet. Click "Add New Lesson" to start.</p>
            </div>
        `;
        return;
    }
    
    courseLessons.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    container.innerHTML = courseLessons.map((lesson, index) => `
        <div class="content-item">
            <div class="content-item-header">
                <div class="content-order">${lesson.order || index + 1}</div>
                <div class="content-info">
                    <h4>${lesson.title || 'Untitled Lesson'}</h4>
                    <p>${lesson.description || 'No description'}</p>
                    <div class="content-meta">
                        ${lesson.duration ? `<span><i class="fas fa-clock"></i> ${lesson.duration}</span>` : ''}
                        ${lesson.videoUrl ? `<span><i class="fas fa-video"></i> Video</span>` : ''}
                        ${lesson.isFree ? `<span class="badge-free">Free Preview</span>` : ''}
                    </div>
                </div>
                <div class="content-actions">
                    <button onclick="editLesson(${index})" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteLesson(${index})" class="btn-icon btn-danger" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function clearLessonForm() {
    const lessonTitle = document.getElementById('lessonTitle');
    const lessonDescription = document.getElementById('lessonDescription');
    const lessonDuration = document.getElementById('lessonDuration');
    const lessonOrder = document.getElementById('lessonOrder');
    const lessonVideoUrl = document.getElementById('lessonVideoUrl');
    const lessonContent = document.getElementById('lessonContent');
    const lessonResources = document.getElementById('lessonResources');
    const lessonIsFree = document.getElementById('lessonIsFree');
    
    if (lessonTitle) lessonTitle.value = '';
    if (lessonDescription) lessonDescription.value = '';
    if (lessonDuration) lessonDuration.value = '';
    if (lessonOrder) lessonOrder.value = courseLessons.length + 1;
    if (lessonVideoUrl) lessonVideoUrl.value = '';
    if (lessonContent) lessonContent.value = '';
    if (lessonResources) lessonResources.value = '';
    if (lessonIsFree) lessonIsFree.checked = false;
}

function renderQuizQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    if (!window.currentQuizQuestions || window.currentQuizQuestions.length === 0) {
        container.innerHTML = '<p style="color: #999;">No questions yet. Click "Add Question" above.</p>';
        return;
    }
    
    container.innerHTML = window.currentQuizQuestions.map((q, index) => `
        <div class="question-item">
            <div class="question-header">
                <strong>Question ${index + 1}</strong>
                <button type="button" onclick="deleteQuestion(${index})" class="btn-icon-small btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="form-group">
                <input type="text" placeholder="Enter question" value="${q.question || ''}" 
                    onchange="updateQuestion(${index}, 'question', this.value)">
            </div>
            <div class="options-grid">
                ${(q.options || ['', '', '', '']).map((opt, optIndex) => `
                    <div class="option-item">
                        <input type="radio" name="correct_${index}" ${(q.correctAnswer || 0) === optIndex ? 'checked' : ''}
                            onchange="updateQuestion(${index}, 'correctAnswer', ${optIndex})">
                        <input type="text" placeholder="Option ${optIndex + 1}" value="${opt || ''}"
                            onchange="updateQuestionOption(${index}, ${optIndex}, this.value)">
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function renderQuizzes() {
    const container = document.getElementById('quizzesContainer');
    if (!container) return;
    
    if (courseQuizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-state-content">
                <i class="fas fa-clipboard-question"></i>
                <p>No quizzes added yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courseQuizzes.map((quiz, index) => `
        <div class="content-item">
            <div class="content-item-header">
                <div class="content-info">
                    <h4>${quiz.title || 'Untitled Quiz'}</h4>
                    <div class="content-meta">
                        <span><i class="fas fa-question"></i> ${quiz.questions?.length || 0} questions</span>
                        <span><i class="fas fa-clock"></i> ${quiz.duration || 30} min</span>
                        <span><i class="fas fa-check"></i> Pass: ${quiz.passingScore || 70}%</span>
                    </div>
                </div>
                <div class="content-actions">
                    <button onclick="editQuiz(${index})" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteQuiz(${index})" class="btn-icon btn-danger" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function clearQuizForm() {
    const quizTitle = document.getElementById('quizTitle');
    const quizDuration = document.getElementById('quizDuration');
    const quizPassingScore = document.getElementById('quizPassingScore');
    const quizInstructions = document.getElementById('quizInstructions');
    const questionsContainer = document.getElementById('questionsContainer');
    
    if (quizTitle) quizTitle.value = '';
    if (quizDuration) quizDuration.value = '30';
    if (quizPassingScore) quizPassingScore.value = '70';
    if (quizInstructions) quizInstructions.value = '';
    if (questionsContainer) questionsContainer.innerHTML = '';
    window.currentQuizQuestions = [];
}

function renderAssignments() {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;
    
    if (courseAssignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state-content">
                <i class="fas fa-file-invoice"></i>
                <p>No assignments added yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courseAssignments.map((assignment, index) => `
        <div class="content-item">
            <div class="content-item-header">
                <div class="content-info">
                    <h4>${assignment.title || 'Untitled Assignment'}</h4>
                    <p>${(assignment.description || '').substring(0, 100)}...</p>
                    <div class="content-meta">
                        <span><i class="fas fa-star"></i> ${assignment.points || 100} points</span>
                        ${assignment.dueDate ? `<span><i class="fas fa-calendar"></i> Due: ${assignment.dueDate}</span>` : ''}
                        <span class="badge-info">${assignment.type || 'essay'}</span>
                    </div>
                </div>
                <div class="content-actions">
                    <button onclick="editAssignment(${index})" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteAssignment(${index})" class="btn-icon btn-danger" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function clearAssignmentForm() {
    const assignmentTitle = document.getElementById('assignmentTitle');
    const assignmentDescription = document.getElementById('assignmentDescription');
    const assignmentDueDate = document.getElementById('assignmentDueDate');
    const assignmentPoints = document.getElementById('assignmentPoints');
    const assignmentType = document.getElementById('assignmentType');
    const assignmentResources = document.getElementById('assignmentResources');
    const assignmentAllowLate = document.getElementById('assignmentAllowLate');
    
    if (assignmentTitle) assignmentTitle.value = '';
    if (assignmentDescription) assignmentDescription.value = '';
    if (assignmentDueDate) assignmentDueDate.value = '';
    if (assignmentPoints) assignmentPoints.value = '100';
    if (assignmentType) assignmentType.value = 'essay';
    if (assignmentResources) assignmentResources.value = '';
    if (assignmentAllowLate) assignmentAllowLate.checked = false;
}

async function handleCourseSubmit(e) {
    e.preventDefault();
    
    if (courseLessons.length === 0) {
        showMessage('Please add at least one lesson to the course', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;
    
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const courseData = buildCourseData();
        
        let response;
        if (editingCourseId) {
            response = await fetch(`${API_URL}/admin/courses/${editingCourseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(courseData)
            });
        } else {
            response = await fetch(`${API_URL}/admin/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(courseData)
            });
        }
        
        if (response.ok) {
            showMessage('Course saved successfully!', 'success');
            resetForm();
            await loadCourses();
            await loadDashboardStats();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save course');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
    }
}

function buildCourseData() {
    const accessLevel = document.getElementById('accessLevel');
    const coursePrice = document.getElementById('coursePrice');
    const price = (accessLevel && accessLevel.value === 'free') ? 0 : 
                 (coursePrice ? parseFloat(coursePrice.value) || 0 : 0);
    
    // Get required levels if premium - THIS IS THE KEY PART
    const requiredLevels = accessLevel?.value === 'premium' ? getSelectedRequiredLevels() : [];
    
    return {
        title: document.getElementById('courseTitle')?.value || '',
        description: document.getElementById('courseDescription')?.value || '',
        longDescription: document.getElementById('longDescription')?.value || 
                       document.getElementById('courseDescription')?.value || '',
        type: document.getElementById('courseType')?.value || 'subject',
        classLevel: document.getElementById('classLevel')?.value || undefined,
        subject: document.getElementById('subject')?.value || undefined,
        subjects: [],
        imageUrl: document.getElementById('imageUrl')?.value || '',
        status: accessLevel?.value || 'draft',
        price: price,
        lessonCount: courseLessons.length,
        duration: document.getElementById('courseDuration')?.value || '',
        level: document.getElementById('courseLevel')?.value || 'beginner',
        isActive: document.getElementById('visibility')?.value === 'published',
        isFeatured: document.getElementById('isFeatured')?.checked || false,
        features: [],
        prerequisites: document.getElementById('prerequisites')?.value.split(',').map(p => p.trim()).filter(Boolean) || [],
        learningGoals: document.getElementById('learningGoals')?.value.split(',').map(g => g.trim()).filter(Boolean) || [],
        tutor: null,
        curriculum: courseLessons,
        certificate: document.getElementById('hasCertificate')?.checked || false,
        language: document.getElementById('language')?.value || 'en',
        category: document.getElementById('category')?.value || 'general',
        tags: document.getElementById('tags')?.value.split(',').map(t => t.trim()).filter(Boolean) || [],
        // THIS SENDS THE REQUIRED LEVELS TO YOUR BACKEND
        requiredLevels: requiredLevels,
        metadata: {
            quizzes: courseQuizzes,
            assignments: courseAssignments,
            quizCount: courseQuizzes.length,
            assignmentCount: courseAssignments.length,
            passingGrade: parseInt(document.getElementById('passingGrade')?.value) || 70,
            promoVideoUrl: document.getElementById('promoVideoUrl')?.value || ''
        }
    };
}

async function loadCourses() {
    try {
        const response = await fetch(`${API_URL}/courses?sortBy=createdAt&order=desc`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayCourses(data.courses || []);
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function displayCourses(courses) {
    const container = document.getElementById('courseListContainer');
    if (!container) return;
    
    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state-content">
                <i class="fas fa-inbox"></i>
                <p>No courses created yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => {
        let courseId = '';
        
        if (course._id && course._id.$oid) {
            courseId = course._id.$oid;
        } else if (course._id) {
            courseId = course._id;
        } else if (course.id && course.id.trim() !== '') {
            courseId = course.id;
        }
        
        if (!courseId) {
            console.error('Course has no valid ID:', course);
            return '<div class="error-card">Error: Course missing ID</div>';
        }
        
        // Get the highest required level for the top badge (APEX > PRIME > SPARK)
        let topLevel = null;
        if (course.requiredLevels && course.requiredLevels.length > 0) {
            if (course.requiredLevels.includes('APEX')) {
                topLevel = 'APEX';
            } else if (course.requiredLevels.includes('PRIME')) {
                topLevel = 'PRIME';
            } else if (course.requiredLevels.includes('SPARK')) {
                topLevel = 'SPARK';
            }
        }
        
        // Determine course badge based on required level
        let courseBadgeClass = 'course-badge ';
        let courseBadgeText = 'FREE';
        let courseBadgeIcon = '';
        
        if (topLevel === 'APEX') {
            courseBadgeClass += 'badge-apex';
            courseBadgeText = 'APEX';
            courseBadgeIcon = '💎';
        } else if (topLevel === 'PRIME') {
            courseBadgeClass += 'badge-prime';
            courseBadgeText = 'PRIME';
            courseBadgeIcon = '👑';
        } else if (topLevel === 'SPARK') {
            courseBadgeClass += 'badge-spark';
            courseBadgeText = 'SPARK';
            courseBadgeIcon = '⚡';
        } else if (course.status === 'free') {
            courseBadgeClass += 'badge-free';
            courseBadgeText = 'FREE';
        } else {
            courseBadgeClass += 'badge-draft';
            courseBadgeText = 'DRAFT';
        }
        
        // Generate all level badges for display below
        const levelBadges = (course.requiredLevels || [])
            .map(level => {
                const levelConfig = USER_LEVELS[level];
                if (!levelConfig) return '';
                
                let badgeStyle = '';
                if (level === 'SPARK') {
                    badgeStyle = 'background: linear-gradient(135deg, #32cd32, #28a428); color: white;';
                } else if (level === 'PRIME') {
                    badgeStyle = 'background: linear-gradient(135deg, #667eea, #764ba2); color: white;';
                } else if (level === 'APEX') {
                    badgeStyle = 'background: linear-gradient(135deg, #c42e00, #9d2400); color: white;';
                }
                
                return `
                    <span class="level-badge" style="${badgeStyle} padding: 4px 10px; border-radius: 12px; font-size: 11px; margin-right: 4px; display: inline-block; margin-top: 4px;">
                        ${levelConfig.icon} ${levelConfig.name}
                    </span>
                `;
            }).join('');
        
        return `
        <div class="course-card">
            <div class="course-card-image" style="background: ${course.imageUrl ? `url('${course.imageUrl}')` : 'linear-gradient(135deg, #667eea, #764ba2)'}; background-size: cover;">
                <span class="${courseBadgeClass}">${courseBadgeIcon} ${courseBadgeText}</span>
            </div>
            <div class="course-card-content">
                <h3>${course.title || 'Untitled Course'}</h3>
                <p>${(course.description || '').substring(0, 100)}...</p>
                
                ${levelBadges ? `
                <div class="level-badges-container" style="margin: 8px 0;">
                    <small style="color: #666; display: block; margin-bottom: 4px;">Required Levels:</small>
                    ${levelBadges}
                </div>
                ` : ''}
                
                <div class="course-card-meta">
                    <span><i class="fas fa-book"></i> ${course.lessonCount || 0} lessons</span>
                    <span><i class="fas fa-users"></i> ${course.enrollmentCount || 0}</span>
                    <span><i class="fas fa-star"></i> ${course.rating || 0}</span>
                </div>
                <div class="course-card-actions">
                    <button onclick="editCourse('${courseId}')" class="btn-edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteCourse('${courseId}')" class="btn-delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function populateFormWithCourse(course) {
    const courseTitle = document.getElementById('courseTitle');
    const courseType = document.getElementById('courseType');
    const courseDescription = document.getElementById('courseDescription');
    const longDescription = document.getElementById('longDescription');
    const courseDuration = document.getElementById('courseDuration');
    const courseLevel = document.getElementById('courseLevel');
    const imageUrl = document.getElementById('imageUrl');
    const classLevel = document.getElementById('classLevel');
    const subject = document.getElementById('subject');
    
    if (courseTitle) courseTitle.value = course.title || '';
    if (courseType) {
        courseType.value = course.type || 'subject';
        courseType.dispatchEvent(new Event('change'));
    }
    if (courseDescription) courseDescription.value = course.description || '';
    if (longDescription) longDescription.value = course.longDescription || '';
    if (courseDuration) courseDuration.value = course.duration || '';
    if (courseLevel) courseLevel.value = course.level || 'beginner';
    if (imageUrl) imageUrl.value = course.imageUrl || '';
    if (classLevel && course.classLevel) classLevel.value = course.classLevel;
    if (subject && course.subject) subject.value = course.subject;
    
    courseLessons = course.curriculum || [];
    courseQuizzes = course.metadata?.quizzes || [];
    courseAssignments = course.metadata?.assignments || [];
    
    renderLessons();
    renderQuizzes();
    renderAssignments();
    
    const prerequisites = document.getElementById('prerequisites');
    const learningGoals = document.getElementById('learningGoals');
    const tags = document.getElementById('tags');
    const language = document.getElementById('language');
    const category = document.getElementById('category');
    const passingGrade = document.getElementById('passingGrade');
    const promoVideoUrl = document.getElementById('promoVideoUrl');
    const accessLevel = document.getElementById('accessLevel');
    const coursePrice = document.getElementById('coursePrice');
    const visibility = document.getElementById('visibility');
    const isFeatured = document.getElementById('isFeatured');
    const hasCertificate = document.getElementById('hasCertificate');
    
    if (prerequisites) prerequisites.value = (course.prerequisites || []).join(', ');
    if (learningGoals) learningGoals.value = (course.learningGoals || []).join(', ');
    if (tags) tags.value = (course.tags || []).join(', ');
    if (language) language.value = course.language || 'en';
    if (category) category.value = course.category || 'general';
    if (passingGrade) passingGrade.value = course.metadata?.passingGrade || 70;
    if (promoVideoUrl) promoVideoUrl.value = course.metadata?.promoVideoUrl || '';
    
    if (accessLevel) {
        accessLevel.value = course.price === 0 ? 'free' : 'premium';
        accessLevel.dispatchEvent(new Event('change'));
        
        if (coursePrice && accessLevel.value === 'paid') {
            coursePrice.value = course.price || '';
        }
    }
    
    // RESTORE THE LEVEL CHECKBOXES WHEN EDITING
    if (course.requiredLevels && course.requiredLevels.length > 0) {
        course.requiredLevels.forEach(level => {
            const checkbox = document.querySelector(`input[name="requiredLevels"][value="${level}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    if (visibility) visibility.value = course.isActive ? 'published' : 'draft';
    if (isFeatured) isFeatured.checked = course.isFeatured || false;
    if (hasCertificate) hasCertificate.checked = course.certificate || false;
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/courses`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const courses = data.courses || [];
            
            const totalLessons = courses.reduce((sum, c) => sum + (c.lessonCount || 0), 0);
            const totalQuizzes = courses.reduce((sum, c) => sum + (c.metadata?.quizCount || 0), 0);
            const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);
            
            const totalCoursesElement = document.getElementById('totalCourses');
            const totalLessonsElement = document.getElementById('totalLessons');
            const totalQuizzesElement = document.getElementById('totalQuizzes');
            const totalEnrollmentsElement = document.getElementById('totalEnrollments');
            
            if (totalCoursesElement) totalCoursesElement.textContent = courses.length;
            if (totalLessonsElement) totalLessonsElement.textContent = totalLessons;
            if (totalQuizzesElement) totalQuizzesElement.textContent = totalQuizzes;
            if (totalEnrollmentsElement) totalEnrollmentsElement.textContent = totalEnrollments;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function resetForm() {
    const courseForm = document.getElementById('courseForm');
    if (courseForm) courseForm.reset();
    
    courseLessons = [];
    courseQuizzes = [];
    courseAssignments = [];
    editingCourseId = null;
    window.editingLessonIndex = null;
    window.editingQuizIndex = null;
    window.editingAssignmentIndex = null;
    window.currentQuizQuestions = [];
    
    renderLessons();
    renderQuizzes();
    renderAssignments();
    
    const submitText = document.getElementById('submitText');
    if (submitText) submitText.textContent = 'Create Course';
    
    const courseType = document.getElementById('courseType');
    if (courseType) {
        courseType.dispatchEvent(new Event('change'));
    }
    
    // UNCHECK ALL LEVEL CHECKBOXES ON RESET
    document.querySelectorAll('input[name="requiredLevels"]').forEach(cb => {
        cb.checked = false;
    });
}

function showMessage(text, type) {
    const container = document.getElementById('messageContainer');
    if (!container) {
        alert(`${type === 'success' ? '✓' : '✗'} ${text}`);
        return;
    }
    
    const className = type === 'success' ? 'message-success' : 'message-error';
    
    container.innerHTML = `
        <div class="${className}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${text}</span>
        </div>
    `;
    
    setTimeout(() => {
        if (container.innerHTML.includes(className)) {
            container.innerHTML = '';
        }
    }, 4000);
}