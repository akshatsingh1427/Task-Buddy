const API_BASE = "http://127.0.0.1:8080";

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentUser = localStorage.getItem("username") || "default";
        this.init();
    }

    async init() {
        await this.fetchTasks();
        this.setupEventListeners();
        this.updateAllDisplays();
    }

    setupEventListeners() {
        const form = document.getElementById("task-form");
        if (form) {
            form.addEventListener("submit", (e) => this.handleAddTask(e));
        }
    }

    async fetchTasks() {
        try {
            console.log("Fetching tasks for user:", this.currentUser);
            const response = await fetch(`${API_BASE}/schedule?user=${this.currentUser}`);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const tasksData = await response.json();
            console.log("Fetched tasks:", tasksData);
            
  
            this.tasks = Array.isArray(tasksData) ? tasksData : [];
            
            this.updateAllDisplays();
            this.showSuccess("Tasks loaded successfully!");
            
        } catch (error) {
            console.error("Error loading tasks:", error);
            this.tasks = [];
            this.updateAllDisplays();
            this.showError("Failed to load tasks. Make sure server is running on port 8080.");
        }
    }

    async handleAddTask(e) {
        e.preventDefault();

        const taskName = document.getElementById("task-name");
        const category = document.getElementById("category");
        const priority = document.getElementById("priority");
        const deadline = document.getElementById("deadline");

        if (!taskName.value.trim()) {
            this.showError("Please enter a task name");
            return;
        }

        if (!deadline.value) {
            this.showError("Please select a deadline");
            return;
        }

        const newTask = {
            id: Date.now(),
            name: taskName.value.trim(),
            category: category.value,
            priority: priority.value.replace('📊 ', '').replace('📈 ', '').replace('🚨 ', '').replace(' Priority', ''),
            deadline: deadline.value,
            completed: false,
            username: this.currentUser
        };

        try {
            console.log("Adding new task:", newTask);

            const response = await fetch(`${API_BASE}/add_task`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newTask)
            });

            console.log("Response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            document.getElementById("task-form").reset();
            await this.fetchTasks();
            this.showSuccess("Task added successfully!");
            
        } catch (error) {
            console.error("Add task error:", error);
            this.showError("Failed to add task. Check server connection.");
        }
    }

    async toggleComplete(id) {
        try {
            const response = await fetch(`${API_BASE}/toggle_complete`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    id: Number(id),
                    username: this.currentUser
                })
            });

            if (!response.ok) throw new Error('Failed to update task');
            await this.fetchTasks();
            
        } catch (error) {
            console.error("Toggle complete error:", error);
            this.showError("Failed to update task.");
        }
    }

    async deleteTask(id) {
        if (!confirm("Are you sure you want to delete this task?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/delete_task`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    id: Number(id),
                    username: this.currentUser
                })
            });

            if (!response.ok) throw new Error('Failed to delete task');
            await this.fetchTasks();
            this.showSuccess("Task deleted successfully!");
        } catch (error) {
            console.error("Delete task error:", error);
            this.showError("Failed to delete task.");
        }
    }

    updateAllDisplays() {
        this.updateTrackers();
        this.updateUpcomingTasks();
        this.updateCalendarTasks();
    }

    getTasksForDate(dateStr) {
        return this.tasks.filter(task => task.deadline === dateStr);
    }

    updateCalendarTasks() {
        const calendarDays = document.querySelectorAll('.calendar-day:not(.empty)');
        
        calendarDays.forEach(day => {
            day.classList.remove('has-tasks');
            const existingCount = day.querySelector('.task-count');
            if (existingCount) {
                existingCount.remove();
            }
        });

        calendarDays.forEach(day => {
            const dayNumber = day.textContent.trim();
            const currentMonth = document.getElementById('current-month').textContent;
            
            const dateStr = this.formatDateForCalendar(dayNumber, currentMonth);
            const tasksOnDate = this.getTasksForDate(dateStr);
            
            if (tasksOnDate.length > 0) {
                day.classList.add('has-tasks');
                
                const taskCount = tasksOnDate.length;
                const countBadge = document.createElement('div');
                countBadge.className = 'task-count';
                countBadge.textContent = taskCount;
                countBadge.style.cssText = `
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: #ff6b6b;
                    color: white;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                `;
                day.appendChild(countBadge);

                day.onclick = () => {
                    this.showTasksForDate(dateStr, tasksOnDate);
                };
            } else {
                day.onclick = null;
            }
        });
    }

    formatDateForCalendar(day, monthYear) {
        const months = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        
        const [month, year] = monthYear.split(' ');
        const monthNum = months[month];
        const dayNum = day.padStart(2, '0');
        
        return `${year}-${monthNum}-${dayNum}`;
    }

    showTasksForDate(date, tasks) {
        const modal = document.getElementById('task-details-modal');
        const title = document.getElementById('task-details-title');
        const content = document.getElementById('task-details-content');
        
        const displayDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        title.textContent = `Tasks for ${displayDate}`;
        
        if (tasks.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #8b7d6b;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No tasks scheduled for this date.</p>
                </div>
            `;
        } else {
            content.innerHTML = tasks.map((task, index) => `
                <div class="task-detail-item" 
                     data-task-id="${task.id}"
                     style="border: 1px solid #e2e8f0; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid ${this.getPriorityColor(task.priority)}; background: ${task.completed ? '#f0fff4' : 'white'}; animation: fadeInUp 0.3s ease ${index * 0.1}s both;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; color: #5c4b37; text-decoration: ${task.completed ? 'line-through' : 'none'};">${this.escapeHtml(task.name)}</h4>
                        <span style="background: ${this.getPriorityColor(task.priority)}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                            ${task.priority}
                        </span>
                    </div>
                    <p style="margin: 0.25rem 0; color: #8b7d6b; font-size: 0.9rem;">
                        <i class="fas fa-tag"></i> ${task.category || 'No category'}
                    </p>
                    <p style="margin: 0.25rem 0; color: #8b7d6b; font-size: 0.9rem;">
                        <i class="fas fa-flag"></i> ${task.priority} Priority
                    </p>
                    <p style="margin: 0.25rem 0; color: #8b7d6b; font-size: 0.9rem;">
                        <i class="fas fa-calendar"></i> ${task.deadline}
                    </p>
                    <p style="margin: 0.25rem 0; color: #8b7d6b; font-size: 0.9rem;">
                        <i class="fas fa-check-circle"></i> ${task.completed ? 'Completed' : 'Pending'}
                    </p>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button onclick="taskManager.toggleComplete(${task.id})" 
                                style="padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; background: ${task.completed ? '#ecc94b' : '#48bb78'}; color: white; font-size: 0.8rem; transition: all 0.3s ease;">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                            ${task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </button>
                        <button onclick="taskManager.deleteTask(${task.id})" 
                                style="padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; background: #f56565; color: white; font-size: 0.8rem; transition: all 0.3s ease;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
    }

    updateTrackers() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const streak = this.calculateStreak();
        const upcomingCount = this.tasks.filter(task => 
            !task.completed && new Date(task.deadline) >= new Date().setHours(0,0,0,0)
        ).length;

        this.updateTrackerElement('upcoming-tracker', upcomingCount, 'Upcoming');
        this.updateTrackerElement('streak-tracker', streak, 'Day Streak');
        this.updateTrackerElement('completion-tracker', completionRate, '% Done');
    }

    updateTrackerElement(trackerId, value, label) {
        const trackerElement = document.querySelector(`[data-tracker="${trackerId}"]`);
        if (!trackerElement) return;

        const valueElement = trackerElement.querySelector('.progress-value');
        const labelElement = trackerElement.querySelector('.tracker-label');

        if (valueElement) {
            const currentValue = parseInt(valueElement.textContent) || 0;
            this.animateValue(valueElement, currentValue, value, 500);
        }

        if (labelElement) {
            labelElement.textContent = label;
        }

        if (trackerId === 'completion-tracker') {
            const progressCircle = trackerElement.querySelector('.circle-progress');
            if (progressCircle) {
                progressCircle.style.background = `conic-gradient(#ff9a8b ${value}%, #f5e6ca ${value}%)`;
            }
        }
    }

    animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * (end - start) + start);
            element.textContent = currentValue;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    calculateStreak() {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let streak = 0;
        let currentDate = new Date(today);
        
        for (let i = 0; i < 30; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const hasCompletedTasks = this.tasks.some(task => 
                task.deadline === dateStr && task.completed
            );
            
            if (hasCompletedTasks) {
                streak++;
            } else if (currentDate < today) {
                break;
            }
            
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return streak;
    }

    updateUpcomingTasks() {
        const upcomingContainer = document.getElementById('upcoming-tasks');
        if (!upcomingContainer) return;

        const today = new Date().toISOString().split('T')[0];
        const upcomingTasks = this.tasks
            .filter(task => !task.completed && task.deadline >= today)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 5);

        if (upcomingTasks.length === 0) {
            upcomingContainer.innerHTML = `
                <div class="empty-upcoming" style="text-align: center; padding: 2rem; color: #8b7d6b;">
                    <i class="fas fa-calendar-check" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No upcoming tasks</p>
                    <small>Add a task to see it here</small>
                </div>
            `;
            return;
        }

        upcomingContainer.innerHTML = upcomingTasks.map((task, index) => `
            <div class="upcoming-task-item ${task.priority.toLowerCase()}-priority" 
                 data-task-id="${task.id}"
                 style="opacity: 0; transform: translateX(-20px); border-left: 4px solid ${this.getPriorityColor(task.priority)}; background: white; padding: 1rem; margin-bottom: 0.75rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 1rem;">
                <div class="task-date" style="background: ${this.getPriorityColor(task.priority)}; color: white; padding: 0.5rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; min-width: 80px; text-align: center;">
                    ${this.formatDisplayDate(task.deadline)}
                </div>
                <div class="task-info" style="flex: 1;">
                    <h4 style="margin: 0 0 0.25rem 0; color: #5c4b37; font-size: 1rem;">${this.escapeHtml(task.name)}</h4>
                    <p style="margin: 0; color: #8b7d6b; font-size: 0.85rem;">${task.category} • ${task.priority} Priority</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="taskManager.toggleComplete(${task.id})" 
                            style="padding: 0.4rem 0.8rem; border: none; border-radius: 6px; cursor: pointer; background: #48bb78; color: white; font-size: 0.75rem;">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="taskManager.deleteTask(${task.id})" 
                            style="padding: 0.4rem 0.8rem; border: none; border-radius: 6px; cursor: pointer; background: #f56565; color: white; font-size: 0.75rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        setTimeout(() => {
            const items = upcomingContainer.querySelectorAll('.upcoming-task-item');
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                    item.style.transition = 'all 0.4s ease';
                }, index * 100);
            });
        }, 100);
    }

    getPriorityColor(priority) {
        const priorityLower = priority.toLowerCase();
        switch(priorityLower) {
            case 'high': return '#f56565';
            case 'medium': return '#ed8936';
            case 'low': return '#48bb78';
            default: return '#a0aec0';
        }
    }

    formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        today.setHours(0,0,0,0);
        tomorrow.setHours(0,0,0,0);
        date.setHours(0,0,0,0);
        
        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : '#f56565'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
}

const additionalStyles = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.calendar-day.has-tasks {
    background: #f0f8ff;
    border-color: #ff9a8b;
}

.calendar-day.has-tasks:hover {
    background: #e1f0ff;
    transform: translateY(-2px);
}

.upcoming-task-item {
    transition: all 0.4s ease;
}

.task-detail-item {
    animation: fadeInUp 0.3s ease;
}

.circle-progress {
    transition: background 0.5s ease-in-out;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

let taskManager;
document.addEventListener("DOMContentLoaded", () => {
    taskManager = new TaskManager();
    
    const deadlineInput = document.getElementById('deadline');
    if (deadlineInput) {
        const today = new Date().toISOString().split('T')[0];
        deadlineInput.min = today;
    }

    const modal = document.getElementById('task-details-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

class ResourceManager {
    constructor() {
        this.resources = JSON.parse(localStorage.getItem('resources')) || [];
        this.currentUser = localStorage.getItem("username") || "default";
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.displayResources();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('file-input');
        const youtubeBtn = document.querySelector('.youtube-input button');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        if (youtubeBtn) {
            youtubeBtn.addEventListener('click', () => this.addYouTubeLink());
        }
    }

    getUserResources() {
        return this.resources.filter(resource => resource.username === this.currentUser);
    }

    addResource(resource) {
        resource.id = Date.now();
        resource.username = this.currentUser;
        resource.createdAt = new Date().toISOString();
        this.resources.push(resource);
        this.saveResources();
        this.displayResources();
        taskManager.showSuccess(`${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)} added successfully!`);
    }

    deleteResource(id) {
        if (confirm("Are you sure you want to delete this resource?")) {
            this.resources = this.resources.filter(resource => resource.id !== id);
            this.saveResources();
            this.displayResources();
            taskManager.showSuccess("Resource deleted successfully!");
        }
    }

    saveResources() {
        localStorage.setItem('resources', JSON.stringify(this.resources));
    }

    handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const resource = {
                    type: 'file',
                    title: file.name,
                    content: e.target.result,
                    fileType: file.type,
                    fileSize: this.formatFileSize(file.size)
                };
                
                this.addResource(resource);
            };
            
            reader.readAsDataURL(file); 
        });

        event.target.value = '';
    }

    addYouTubeLink() {
        const linkInput = document.getElementById('youtube-link');
        const link = linkInput.value.trim();
        
        if (!link) {
            taskManager.showError('Please enter a YouTube URL');
            return;
        }

        const videoId = this.extractYouTubeId(link);
        if (!videoId) {
            taskManager.showError('Please enter a valid YouTube URL');
            return;
        }

        const resource = {
            type: 'youtube',
            title: `YouTube Video - ${videoId}`,
            content: link,
            videoId: videoId
        };
        
        this.addResource(resource);
        linkInput.value = '';
    }

    displayResources() {
        const resourcesList = document.getElementById('resources-list');
        if (!resourcesList) return;

        const userResources = this.getUserResources();

        if (userResources.length === 0) {
            resourcesList.innerHTML = `
                <div class="empty-resources">
                    <i class="fas fa-folder-open"></i>
                    <p>No resources yet</p>
                    <small>Upload files or add YouTube links</small>
                </div>
            `;
            return;
        }

        resourcesList.innerHTML = userResources.map(resource => `
            <div class="resource-item" data-resource-id="${resource.id}">
                <div class="resource-icon">
                    ${this.getResourceIcon(resource)}
                </div>
                <div class="resource-info">
                    <div class="resource-title">${this.escapeHtml(resource.title)}</div>
                    <div class="resource-meta">
                        ${this.getResourceMeta(resource)}
                    </div>
                </div>
                <div class="resource-actions">
                    <button class="view-btn" onclick="resourceManager.viewResource(${resource.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="delete-btn" onclick="resourceManager.deleteResource(${resource.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewResource(id) {
        const resource = this.resources.find(r => r.id === id);
        if (!resource) return;

        const modal = document.getElementById('task-details-modal');
        const title = document.getElementById('task-details-title');
        const content = document.getElementById('task-details-content');

        title.textContent = resource.title;
        
        let resourceContent = '';
        
        switch (resource.type) {
            case 'file':
                resourceContent = this.renderFile(resource);
                break;
            case 'youtube':
                resourceContent = this.renderYouTube(resource);
                break;
        }

        content.innerHTML = resourceContent;
        modal.style.display = 'block';
    }

    renderFile(resource) {
        if (resource.fileType.startsWith('image/')) {
            return `
                <div class="file-preview">
                    <h4><i class="fas fa-file-image"></i> Image Preview</h4>
                    <img src="${resource.content}" alt="${resource.title}" style="max-width: 100%; max-height: 400px; border-radius: 8px;">
                    <div style="margin-top: 1rem; text-align: center;">
                        <p><strong>${resource.title}</strong></p>
                        <p style="color: #8b7d6b;">Size: ${resource.fileSize}</p>
                        <button onclick="resourceManager.downloadFile('${resource.content}', '${resource.title}')" 
                                style="background: #ff9a8b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="file-preview">
                    <h4><i class="fas fa-file"></i> File Preview</h4>
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fas fa-file-download" style="font-size: 3rem; color: #ff9a8b; margin-bottom: 1rem;"></i>
                        <p><strong>${resource.title}</strong></p>
                        <p style="color: #8b7d6b;">Size: ${resource.fileSize}</p>
                        <p style="color: #8b7d6b;">Type: ${resource.fileType}</p>
                        <button onclick="resourceManager.downloadFile('${resource.content}', '${resource.title}')" 
                                style="background: #ff9a8b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                            <i class="fas fa-download"></i> Download File
                        </button>
                    </div>
                </div>
            `;
        }
    }

    renderYouTube(resource) {
        return `
            <div class="youtube-preview">
                <h4><i class="fab fa-youtube"></i> YouTube Video</h4>
                <div class="youtube-player">
                    <iframe 
                        width="100%" 
                        height="400" 
                        src="https://www.youtube.com/embed/${resource.videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
                <div style="margin-top: 1rem;">
                    <p><strong>${resource.title}</strong></p>
                    <a href="${resource.content}" target="_blank" style="color: #ff9a8b; text-decoration: none;">
                        <i class="fas fa-external-link-alt"></i> Open in YouTube
                    </a>
                </div>
            </div>
        `;
    }

    getResourceIcon(resource) {
        switch (resource.type) {
            case 'file':
                if (resource.fileType.startsWith('image/')) return '<i class="fas fa-file-image"></i>';
                if (resource.fileType.startsWith('video/')) return '<i class="fas fa-file-video"></i>';
                if (resource.fileType.includes('pdf')) return '<i class="fas fa-file-pdf"></i>';
                if (resource.fileType.includes('word') || resource.fileType.includes('document')) return '<i class="fas fa-file-word"></i>';
                return '<i class="fas fa-file"></i>';
            case 'youtube':
                return '<i class="fab fa-youtube"></i>';
            default:
                return '<i class="fas fa-file"></i>';
        }
    }

    getResourceMeta(resource) {
        switch (resource.type) {
            case 'file':
                return `<span>${resource.fileSize}</span>`;
            case 'youtube':
                return `<span>YouTube Video</span>`;
            default:
                return `<span>${resource.type}</span>`;
        }
    }

    extractYouTubeId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadFile(content, filename) {
        const link = document.createElement('a');
        link.href = content;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

const resourceManager = new ResourceManager();

function closeTaskModal() {
    document.getElementById('task-details-modal').style.display = 'none';
}

const resourcesStyles = `
.resources-content {
    max-height: 300px;
    overflow-y: auto;
}

.upload-area {
    border: 2px dashed #ff9a8b;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 1rem;
}

.upload-area:hover {
    background: #fff5f5;
    border-color: #ff6b6b;
}

.upload-area i {
    font-size: 2rem;
    color: #ff9a8b;
    margin-bottom: 0.5rem;
}

.youtube-input {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.youtube-input input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.9rem;
}

.youtube-input button {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
}

.resource-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
}

.resource-item:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transform: translateY(-1px);
}

.resource-icon {
    font-size: 1.5rem;
    color: #ff9a8b;
    margin-right: 1rem;
    width: 40px;
    text-align: center;
}

.resource-info {
    flex: 1;
}

.resource-title {
    font-weight: 600;
    color: #5c4b37;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
}

.resource-meta {
    font-size: 0.8rem;
    color: #8b7d6b;
}

.resource-actions {
    display: flex;
    gap: 0.5rem;
}

.view-btn, .delete-btn {
    background: none;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.3s ease;
}

.view-btn {
    color: #48bb78;
}

.view-btn:hover {
    background: #f0fff4;
}

.delete-btn {
    color: #f56565;
}

.delete-btn:hover {
    background: #fef5f5;
}

.empty-resources {
    text-align: center;
    padding: 2rem;
    color: #8b7d6b;
}

.empty-resources i {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #e2e8f0;
}

.file-preview, .youtube-preview {
    text-align: center;
}

.youtube-player {
    border-radius: 8px;
    overflow: hidden;
    margin: 1rem 0;
}

.maximize-btn {
    background: none;
    border: none;
    color: #8b7d6b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.maximize-btn:hover {
    background: #f5e6ca;
    color: #5c4b37;
}
`;

const resourcesStyleSheet = document.createElement('style');
resourcesStyleSheet.textContent = resourcesStyles;
document.head.appendChild(resourcesStyleSheet);


