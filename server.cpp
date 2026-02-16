
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <map>
#include <fstream>
#include <algorithm>
#include <cstring>
#include <ctime>
#include <winsock2.h>
#include <ws2tcpip.h>

#pragma comment(lib, "ws2_32.lib")

struct Task {
    long long id;
    std::string name;
    std::string category;
    std::string priority;
    std::string deadline;
    bool completed;
    std::string username;
};

struct User {
    std::string username;
    std::string password;
};

std::vector<Task> tasks;
std::vector<User> users;

std::string getMimeType(const std::string& path) {
    if (path.find(".html") != std::string::npos) return "text/html";
    if (path.find(".css") != std::string::npos) return "text/css";
    if (path.find(".js") != std::string::npos) return "application/javascript";
    if (path.find(".json") != std::string::npos) return "application/json";
    return "text/plain";
}

std::string serveFile(const std::string& filename) {
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        std::string notFound = "File not found: " + filename;
        std::string response = "HTTP/1.1 404 Not Found\r\n";
        response += "Content-Type: text/plain\r\n";
        response += "Content-Length: " + std::to_string(notFound.length()) + "\r\n";
        response += "Connection: close\r\n\r\n";
        response += notFound;
        return response;
    }
    
    std::string content((std::istreambuf_iterator<char>(file)), 
                       std::istreambuf_iterator<char>());
    file.close();
    
    std::string response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + getMimeType(filename) + "\r\n";
    response += "Content-Length: " + std::to_string(content.length()) + "\r\n";
    response += "Connection: close\r\n\r\n";
    response += content;
    return response;
}

std::string createResponse(const std::string &content, const std::string &contentType = "application/json") {
    std::string response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: " + contentType + "\r\n";
    response += "Access-Control-Allow-Origin: *\r\n";
    response += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
    response += "Access-Control-Allow-Headers: Content-Type\r\n";
    response += "Content-Length: " + std::to_string(content.length()) + "\r\n";
    response += "Connection: close\r\n\r\n";
    response += content;
    return response;
}

std::string createErrorResponse(const std::string &error, int statusCode = 400) {
    std::string content = "{\"error\":\"" + error + "\"}";
    std::string response = "HTTP/1.1 " + std::to_string(statusCode) + " Bad Request\r\n";
    response += "Content-Type: application/json\r\n";
    response += "Access-Control-Allow-Origin: *\r\n";
    response += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
    response += "Access-Control-Allow-Headers: Content-Type\r\n";
    response += "Content-Length: " + std::to_string(content.length()) + "\r\n";
    response += "Connection: close\r\n\r\n";
    response += content;
    return response;
}

void loadUsers() {
    std::ifstream file("users.json");
    if (!file.is_open()) {
        std::cout << "No users.json found, starting fresh.\n";
        return;
    }
    
    std::string content((std::istreambuf_iterator<char>(file)), 
                       std::istreambuf_iterator<char>());
    file.close();
    
    users.clear();
    
    size_t pos = 0;
    while ((pos = content.find("\"username\"", pos)) != std::string::npos) {
        User user;
        
        size_t user_start = content.find(":", pos) + 1;
        user_start = content.find("\"", user_start) + 1;
        size_t user_end = content.find("\"", user_start);
        user.username = content.substr(user_start, user_end - user_start);
        
        size_t pass_pos = content.find("\"password\"", user_end);
        if (pass_pos == std::string::npos) break;
        
        size_t pass_start = content.find(":", pass_pos) + 1;
        pass_start = content.find("\"", pass_start) + 1;
        size_t pass_end = content.find("\"", pass_start);
        user.password = content.substr(pass_start, pass_end - pass_start);
        
        users.push_back(user);
        pos = pass_end;
    }
}

void saveUsers() {
    std::ofstream file("users.json");
    if (!file.is_open()) {
        std::cerr << "Failed to create users.json\n";
        return;
    }
    
    file << "[\n";
    for (size_t i = 0; i < users.size(); i++) {
        const User &u = users[i];
        file << "  {\n";
        file << "    \"username\": \"" << u.username << "\",\n";
        file << "    \"password\": \"" << u.password << "\"\n";
        file << "  }";
        if (i < users.size() - 1) file << ",";
        file << "\n";
    }
    file << "]";
    file.close();
}

bool userExists(const std::string& username) {
    for (const auto& user : users) {
        if (user.username == username) {
            return true;
        }
    }
    return false;
}

bool validateUser(const std::string& username, const std::string& password) {
    loadUsers();
    
    for (const auto& user : users) {
        if (user.username == username && user.password == password) {
            return true;
        }
    }
    return false;
}

void saveTasks() {
    std::ofstream file("tasks.json");
    if (!file.is_open()) {
        std::cerr << "Failed to create tasks.json\n";
        return;
    }
    
    file << "[\n";
    for (size_t i = 0; i < tasks.size(); i++) {
        const Task &t = tasks[i];
        file << "  {\n";
        file << "    \"id\": " << t.id << ",\n";
        file << "    \"name\": \"" << t.name << "\",\n";
        file << "    \"category\": \"" << t.category << "\",\n";
        file << "    \"priority\": \"" << t.priority << "\",\n";
        file << "    \"deadline\": \"" << t.deadline << "\",\n";
        file << "    \"completed\": " << (t.completed ? "true" : "false") << ",\n";
        file << "    \"username\": \"" << t.username << "\"\n";
        file << "  }";
        if (i < tasks.size() - 1) file << ",";
        file << "\n";
    }
    file << "]";
    file.close();
}

void loadTasks() {
    std::ifstream file("tasks.json");
    if (!file.is_open()) {
        std::cout << "No tasks.json found, starting fresh.\n";
        return;
    }
    
    std::string content((std::istreambuf_iterator<char>(file)), 
                       std::istreambuf_iterator<char>());
    file.close();
    
    tasks.clear();
    
    size_t pos = 0;
    while ((pos = content.find("\"id\"", pos)) != std::string::npos) {
        Task task;
        
        size_t id_start = content.find(":", pos) + 1;
        size_t id_end = content.find(",", id_start);
        task.id = std::stoll(content.substr(id_start, id_end - id_start));
        
        size_t name_start = content.find("\"name\"", id_end);
        name_start = content.find(":", name_start) + 1;
        name_start = content.find("\"", name_start) + 1;
        size_t name_end = content.find("\"", name_start);
        task.name = content.substr(name_start, name_end - name_start);
        
        size_t category_start = content.find("\"category\"", name_end);
        if (category_start != std::string::npos) {
            category_start = content.find(":", category_start) + 1;
            category_start = content.find("\"", category_start) + 1;
            size_t category_end = content.find("\"", category_start);
            task.category = content.substr(category_start, category_end - category_start);
        }
        
        size_t priority_start = content.find("\"priority\"", name_end);
        priority_start = content.find(":", priority_start) + 1;
        priority_start = content.find("\"", priority_start) + 1;
        size_t priority_end = content.find("\"", priority_start);
        task.priority = content.substr(priority_start, priority_end - priority_start);
        
        size_t deadline_start = content.find("\"deadline\"", priority_end);
        deadline_start = content.find(":", deadline_start) + 1;
        deadline_start = content.find("\"", deadline_start) + 1;
        size_t deadline_end = content.find("\"", deadline_start);
        task.deadline = content.substr(deadline_start, deadline_end - deadline_start);
        
        size_t completed_start = content.find("\"completed\"", deadline_end);
        completed_start = content.find(":", completed_start) + 1;
        size_t completed_end = content.find(",", completed_start);
        if (completed_end == std::string::npos) completed_end = content.find("}", completed_start);
        std::string completed_str = content.substr(completed_start, completed_end - completed_start);
        task.completed = (completed_str.find("true") != std::string::npos);
        
        size_t username_start = content.find("\"username\"", deadline_end);
        if (username_start != std::string::npos) {
            username_start = content.find(":", username_start) + 1;
            username_start = content.find("\"", username_start) + 1;
            size_t username_end = content.find("\"", username_start);
            task.username = content.substr(username_start, username_end - username_start);
        } else {
            task.username = "default";
        }
        
        tasks.push_back(task);
        pos = completed_end;
    }
}

std::map<std::string, std::string> parseJson(const std::string &json) {
    std::map<std::string, std::string> result;
    size_t pos = 0;
    
    while ((pos = json.find("\"", pos)) != std::string::npos) {
        size_t key_start = pos + 1;
        size_t key_end = json.find("\"", key_start);
        std::string key = json.substr(key_start, key_end - key_start);
        
        size_t value_start = json.find(":", key_end) + 1;
        while (value_start < json.length() && (json[value_start] == ' ' || json[value_start] == '\n' || json[value_start] == '\r' || json[value_start] == '\t')) {
            value_start++;
        }
        
        std::string value;
        if (value_start < json.length() && json[value_start] == '\"') {
            value_start++;
            size_t value_end = json.find("\"", value_start);
            value = json.substr(value_start, value_end - value_start);
            pos = value_end + 1;
        } else {
            size_t value_end = json.find_first_of(",}\n\r\t", value_start);
            value = json.substr(value_start, value_end - value_start);
            while (!value.empty() && (value.back() == ' ' || value.back() == '\n' || value.back() == '\r' || value.back() == '\t')) {
                value.pop_back();
            }
            pos = value_end;
        }
        
        result[key] = value;
    }
    
    return result;
}

std::string handleRequest(const std::string &method, const std::string &path, const std::string &body) {
    std::cout << "Request: " << method << " " << path << std::endl;
    
    if (method == "GET") {
        if (path == "/" || path == "/index.html") {
            return serveFile("index.html");
        }
        else if (path == "/login.html") {
            return serveFile("login.html");
        }
        else if (path == "/signup.html") {
            return serveFile("signup.html");
        }
        else if (path == "/style.css") {
            return serveFile("style.css");
        }
        else if (path == "/script.js") {
            return serveFile("script.js");
        }
        else if (path.find("/schedule") == 0) {
     
            std::string username = "default";
            size_t user_pos = path.find("?user=");
            if (user_pos != std::string::npos) {
                username = path.substr(user_pos + 6);
       
                size_t end_pos = username.find("&");
                if (end_pos != std::string::npos) {
                    username = username.substr(0, end_pos);
                }
                end_pos = username.find(" ");
                if (end_pos != std::string::npos) {
                    username = username.substr(0, end_pos);
                }
            }
            
            std::cout << "Getting tasks for user: '" << username << "'" << std::endl;
            
            std::string json = "[";
            int count = 0;
            for (size_t i = 0; i < tasks.size(); i++) {
                const Task &t = tasks[i];
                if (t.username == username) {
                    if (count > 0) json += ",";
                    json += "{";
                    json += "\"id\":" + std::to_string(t.id) + ",";
                    json += "\"name\":\"" + t.name + "\",";
                    json += "\"category\":\"" + t.category + "\",";
                    json += "\"priority\":\"" + t.priority + "\",";
                    json += "\"deadline\":\"" + t.deadline + "\",";
                    json += "\"completed\":";
                    json += (t.completed ? "true" : "false");
                    json += "}";
                    count++;
                }
            }
            json += "]";
            std::cout << "Returning " << count << " tasks for user: " << username << std::endl;
            return createResponse(json);
        }
    }
    
    if (method == "POST" && path == "/add_task") {
        auto data = parseJson(body);
        if (data.find("id") == data.end() || data.find("name") == data.end()) {
            return createErrorResponse("Missing required fields");
        }
        
        Task task;
        task.id = std::stoll(data["id"]);
        task.name = data["name"];
        task.category = data["category"];
        task.priority = data["priority"];
        task.deadline = data["deadline"];
        task.completed = false;
        task.username = data["username"];
        
        std::cout << "Adding task for user: " << task.username << std::endl;
        
        tasks.push_back(task);
        saveTasks();
        
        return createResponse("{\"message\":\"Task added successfully\"}");
    }
    
    if (method == "POST" && path == "/toggle_complete") {
        auto data = parseJson(body);
        if (data.find("id") == data.end()) {
            return createErrorResponse("Missing task ID");
        }
        
        long long taskId = std::stoll(data["id"]);
        std::string username = data["username"];
        
        for (auto &t : tasks) {
            if (t.id == taskId && t.username == username) {
                t.completed = !t.completed;
                saveTasks();
                return createResponse("{\"message\":\"Updated\"}");
            }
        }
        
        return createErrorResponse("Task not found");
    }
    
    if (method == "POST" && path == "/delete_task") {
        auto data = parseJson(body);
        if (data.find("id") == data.end()) {
            return createErrorResponse("Missing task ID");
        }
        
        long long taskId = std::stoll(data["id"]);
        std::string username = data["username"];
        
        for (size_t i = 0; i < tasks.size(); i++) {
            if (tasks[i].id == taskId && tasks[i].username == username) {
                tasks.erase(tasks.begin() + i);
                saveTasks();
                return createResponse("{\"message\":\"Deleted\"}");
            }
        }
        
        return createErrorResponse("Task not found");
    }
    
    if (method == "POST" && path == "/register") {
        auto data = parseJson(body);
        if (data.find("username") == data.end() || data.find("password") == data.end()) {
            return createErrorResponse("Missing username or password");
        }
        
        std::string username = data["username"];
        std::string password = data["password"];
        
        if (userExists(username)) {
            return createErrorResponse("Username already exists");
        }
        
        User newUser;
        newUser.username = username;
        newUser.password = password;
        users.push_back(newUser);
        saveUsers();
        
        return createResponse("{\"message\":\"User registered successfully\"}");
    }
    
    if (method == "POST" && path == "/login") {
        auto data = parseJson(body);
        if (data.find("username") == data.end() || data.find("password") == data.end()) {
            return createErrorResponse("Missing username or password");
        }
        
        std::string username = data["username"];
        std::string password = data["password"];
        
        if (validateUser(username, password)) {
            return createResponse("{\"message\":\"Login successful\",\"username\":\"" + username + "\"}");
        } else {
            return createErrorResponse("Invalid username or password");
        }
    }
    
    if (method == "OPTIONS") {
        return createResponse("");
    }
    
    return serveFile("login.html");
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed\n";
        return 1;
    }
    
    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed\n";
        WSACleanup();
        return 1;
    }
    
    int opt = 1;
    if (setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt)) < 0) {
        std::cerr << "Setsockopt failed\n";
    }
    
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(8080);
    
    if (bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed\n";
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }
    
    if (listen(serverSocket, 10) == SOCKET_ERROR) {
        std::cerr << "Listen failed\n";
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }
    
    loadTasks();
    loadUsers();
    std::cout << " Server running on http://127.0.0.1:8080\n";
    std::cout << " Loaded " << tasks.size() << " tasks and " << users.size() << " users\n";
    
    while (true) {
        sockaddr_in clientAddr;
        int clientAddrSize = sizeof(clientAddr);
        SOCKET clientSocket = accept(serverSocket, (sockaddr*)&clientAddr, &clientAddrSize);
        
        if (clientSocket == INVALID_SOCKET) {
            std::cerr << "Accept failed\n";
            continue;
        }
        
        char buffer[4096];
        int bytesReceived = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
        
        if (bytesReceived > 0) {
            buffer[bytesReceived] = '\0';
            std::string request(buffer);
            
            size_t method_end = request.find(' ');
            std::string method = request.substr(0, method_end);
            
            size_t path_start = method_end + 1;
            size_t path_end = request.find(' ', path_start);
            std::string path = request.substr(path_start, path_end - path_start);
            
            std::string body;
            size_t body_start = request.find("\r\n\r\n");
            if (body_start != std::string::npos) {
                body_start += 4;
                body = request.substr(body_start);
            }
            
            std::string response = handleRequest(method, path, body);
            send(clientSocket, response.c_str(), response.length(), 0);
        }
        
        closesocket(clientSocket);
    }
    
    closesocket(serverSocket);
    WSACleanup();
    return 0;
}


