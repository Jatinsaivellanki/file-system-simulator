#include <bits/stdc++.h>
using namespace std;

const int DISK_SIZE = 50;

// Files (NO "backend/" prefix — we run inside backend/)
const string DISK_FILE = "disk.txt";
const string FILES_FILE = "files.txt";
const string BACKUP_DISK_FILE = "backup_disk.txt";
const string BACKUP_FILES_FILE = "backup_files.txt";

vector<int> disk(DISK_SIZE, 0);
map<string, vector<int>> files;

// ================= STATE LOAD =================
void loadState() {
    // Load disk
    ifstream dfile(DISK_FILE);
    if (dfile) {
        for (int i = 0; i < DISK_SIZE; i++) {
            dfile >> disk[i];
        }
    }

    // Load files
    ifstream ffile(FILES_FILE);
    if (ffile) {
        files.clear();
        string line;
        while (getline(ffile, line)) {
            if (line.empty()) continue;

            // format: file1:2,3,4
            int pos = line.find(':');
            if (pos == string::npos) continue;

            string name = line.substr(0, pos);
            string blocks = line.substr(pos + 1);

            vector<int> blockList;
            stringstream ss(blocks);
            string temp;

            while (getline(ss, temp, ',')) {
                if (!temp.empty())
                    blockList.push_back(stoi(temp));
            }

            files[name] = blockList;
        }
    }

    // Create backup if not exists (first run)
    if (!ifstream(BACKUP_DISK_FILE)) {
        ofstream bd(BACKUP_DISK_FILE);
        for (int i = 0; i < DISK_SIZE; i++) bd << disk[i] << " ";

        ofstream bf(BACKUP_FILES_FILE);
        for (auto &p : files) {
            bf << p.first << ":";
            for (int i = 0; i < p.second.size(); i++) {
                bf << p.second[i];
                if (i < p.second.size() - 1) bf << ",";
            }
            bf << "\n";
        }
    }
}

// ================= STATE SAVE =================
void saveState() {
    ofstream dfile(DISK_FILE);
    for (int i = 0; i < DISK_SIZE; i++) {
        dfile << disk[i] << " ";
    }

    ofstream ffile(FILES_FILE);
    for (auto &p : files) {
        ffile << p.first << ":";
        for (int i = 0; i < p.second.size(); i++) {
            ffile << p.second[i];
            if (i < p.second.size() - 1) ffile << ",";
        }
        ffile << "\n";
    }
}

// ================= BACKUP =================
void backupState() {
    ofstream bd(BACKUP_DISK_FILE);
    for (int i = 0; i < DISK_SIZE; i++) bd << disk[i] << " ";

    ofstream bf(BACKUP_FILES_FILE);
    for (auto &p : files) {
        bf << p.first << ":";
        for (int i = 0; i < p.second.size(); i++) {
            bf << p.second[i];
            if (i < p.second.size() - 1) bf << ",";
        }
        bf << "\n";
    }
}

// ================= LOAD BACKUP =================
void loadBackup() {
    ifstream bd(BACKUP_DISK_FILE);
    if (!bd) return;

    for (int i = 0; i < DISK_SIZE; i++) bd >> disk[i];

    ifstream bf(BACKUP_FILES_FILE);
    files.clear();

    string line;
    while (getline(bf, line)) {
        if (line.empty()) continue;

        int pos = line.find(':');
        if (pos == string::npos) continue;

        string name = line.substr(0, pos);
        string blocks = line.substr(pos + 1);

        vector<int> blockList;
        stringstream ss(blocks);
        string temp;

        while (getline(ss, temp, ',')) {
            if (!temp.empty())
                blockList.push_back(stoi(temp));
        }

        files[name] = blockList;
    }
}

// ================= FIND CONTIGUOUS =================
vector<int> findContiguous(int size) {
    for (int i = 0; i <= DISK_SIZE - size; i++) {
        bool ok = true;
        for (int j = 0; j < size; j++) {
            if (disk[i + j] == 1) {
                ok = false;
                break;
            }
        }
        if (ok) {
            vector<int> res;
            for (int j = 0; j < size; j++) res.push_back(i + j);
            return res;
        }
    }
    return {};
}

// ================= JSON OUTPUT =================
void printJSON(string status, string message) {
    cout << "{";
    cout << "\"status\":\"" << status << "\",";
    cout << "\"message\":\"" << message << "\",";

    cout << "\"disk\":[";
    for (int i = 0; i < DISK_SIZE; i++) {
        cout << disk[i];
        if (i < DISK_SIZE - 1) cout << ",";
    }
    cout << "],";

    cout << "\"files\":{";
    int count = 0;
    for (auto &p : files) {
        cout << "\"" << p.first << "\":[";
        for (int i = 0; i < p.second.size(); i++) {
            cout << p.second[i];
            if (i < p.second.size() - 1) cout << ",";
        }
        cout << "]";
        if (count < files.size() - 1) cout << ",";
        count++;
    }
    cout << "}";
    cout << "}";
}

// ================= OPERATIONS =================
void createFile(string name, int size) {
    if (files.count(name)) {
        printJSON("error", "File already exists");
        return;
    }

    auto blocks = findContiguous(size);
    if (blocks.empty()) {
        printJSON("error", "No contiguous space");
        return;
    }

    for (int b : blocks) disk[b] = 1;
    files[name] = blocks;

    backupState();
    printJSON("success", "File created");
}

void deleteFile(string name) {
    if (!files.count(name)) {
        printJSON("error", "File not found");
        return;
    }

    for (int b : files[name]) disk[b] = 0;
    files.erase(name);

    backupState();
    printJSON("success", "File deleted");
}

void crashSystem() {
    srand(time(0));

    if (!files.empty() && rand() % 2) {
        auto it = files.begin();
        advance(it, rand() % files.size());
        files.erase(it);
    } else {
        for (int i = 0; i < 3; i++) {
            int idx = rand() % DISK_SIZE;
            disk[idx] = 1 - disk[idx];
        }
    }

    printJSON("success", "Crash simulated");
}

void recoverSystem() {
    loadBackup();
    printJSON("success", "Recovered from backup");
}

// ================= MAIN =================
int main(int argc, char* argv[]) {
    loadState();

    string cmd = argv[1];

    if (cmd == "CREATE") createFile(argv[2], stoi(argv[3]));
    else if (cmd == "DELETE") deleteFile(argv[2]);
    else if (cmd == "CRASH") crashSystem();
    else if (cmd == "RECOVER") recoverSystem();
    else if (cmd == "SHOW") printJSON("success", "State fetched");

    saveState();
}