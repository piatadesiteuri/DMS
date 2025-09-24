const express = require("express")
const route = express.Router()
const db = require('../db/db')
const adminFonctionalities = require('../controller/adminFonctionalities')
const fs = require('fs');
const path = require('path');


route.post('/getuser', async function (req, res) {
    var id = req.body.id;
    console.log(id)
    res.json(await db.dbGetUserNameById(id));
});

route.get('/documents', async function (req, res) {
    try {
        const id_user = req.session.id_user;
        console.log("Documents request for user:", id_user);

        const rows = await db.dbListDocumentsReceved(id_user);
        console.log("Documents result:", rows);

        if (rows && rows.length > 0) {
            console.log("Sending documents to frontend:", rows);
            res.json(rows);
        } else {
            console.log("No documents found for user:", id_user);
            res.json([]);
        }
    } catch (err) {
        console.error("Error in documents route:", err);
        res.status(500).json({ error: "Server error" });
    }
});


route.get('/list_user', async (req, res) => {
    var valid;
    try {
        const rows = await db.dbListUsers(req.session.id_user);
        valid = rows;

    } catch (err) {
        console.error("Error occurred:", err);

    }
    res.json(valid);
})
let EMAIL_SECRET = 'your_secret_key';
route.get('/confirmation/:token', async (req, res) => {
    await adminFonctionalities.confirmationToken(req.params.token, EMAIL_SECRET)
    res.redirect('/');
});
route.get('/verifydoc', async function (req, res) {
    var docs;

    const rows = await db.dbListDocumentsNV();
    docs = rows;
    res.json(docs);
})
route.post('/VerifyFun', async function (req, res) {
    const nom = req.body.nom_doc;
    const id = req.body.id_user;

    try {
        await db.dbVerifyDocument(id, nom);
        res.redirect('/home_page');

    } catch (err) {
        console.error("Error occurred:", err);
    }
})

route.post('/doc/open/:nom_doc', async function (req, res) {
    const nom_doc = req.params.nom_doc;
    const id_user = req.session.id_user;
    try {
        await db.dbDocumentLog(nom_doc, id_user);
    } catch (err) {
        console.error("Error occurred:", err);
    }

})

route.get('/FrequentlyUsed', async function (req, res) {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const id_user = req.session.id_user;
    try {
        const rows = await db.dbFrequentlyOpenedDocuments(id_user);
        // Always return an array, even if empty
        res.json(rows || []);
    } catch (err) {
        console.error("Error fetching frequently used documents:", err);
        res.status(500).json({ error: "Failed to fetch frequently used documents" });
    }
});
route.get('/getpath/:nom_doc', async function (req, res) {
    const nom_doc = req.params.nom_doc;
    try {
        const path = await db.dbGetPath(nom_doc);
        if (!path || path.length === 0) {
            return res.status(404).json({ error: "Document not found" });
        }
        res.json(path[0].path);
    } catch (err) {
        console.error("Error occurred:", err);
        res.status(500).json({ error: "Internal server error" });
    }
})
route.get('/MyDocumentsList', async function (req, res) {
    console.log("Backend: MyDocumentsList route accessed");
    console.log("Backend: User ID:", req.session.id_user);
    console.log("Backend: User Role:", req.session.role);

    var docs;
    const id_user = req.session.id_user;
    const roles = req.session.role;
    console.log("MyDocumentsList request for user:", id_user, "with role:", roles);
    if (roles == "user") {
        try {
            console.log("Backend: Fetching documents for user role");
            const rows = await db.dbMyDocuments(id_user);
            console.log("MyDocuments result:", rows);
            if (rows && rows.length > 0) {
                docs = rows;
                console.log("Sending documents to frontend:", docs);
                res.json(docs);
            } else {
                console.log("No documents found for user:", id_user);
                res.json([]);
            }
        } catch (err) {
            console.error("Backend: Error in MyDocumentsList:", err);
            res.status(500).json({ error: "Server error" });
        }
    } else if (roles == "responsable") {
        console.log("Backend: Fetching all documents for responsable role");
        const rows = await db.dbAllDocs();

        if (rows.length > 0) {
            docs = rows;
            res.json(docs);
        }




    }
});
route.post('/diffuser', async function (req, res) {
    console.log(req.body);
    const nom_doc = req.body.nom_doc;
    const target = req.body.target;
    console.log(nom_doc, target);
    // Ensure targets is an array
    if (!Array.isArray(target)) {
        res.status(400).json({ error: 'Target must be an array' });
    } else {
        // Iterate over targets and perform necessary actions
        for (const targe of target) {
            await db.dbIdReciever(targe, nom_doc);
        }
        // Respond with success
        res.status(200).json({ success: true });
    }
});
route.get('/Previleges/:nom_doc', async function (req, res) {
    const nom_document = req.params.nom_doc;
    const id_user = req.session.id_user;

    if (!id_user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const rows = await db.dbGetPrevileges(id_user, nom_document);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "No privileges found" });
        }
        res.json(rows);
    } catch (err) {
        console.error("Error fetching privileges:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
});




route.post('admin/add', adminFonctionalities.acceptUser);
route.get('admin/validation', adminFonctionalities.getUsers);

// Adăugăm o nouă rută pentru a căuta PDF-uri în toate directoarele posibile
route.get('/find-pdf/:filename', async function (req, res) {
    const filename = req.params.filename;

    console.log(`Searching for PDF: ${filename}`);

    // Define the root uploads directory - fix path to be within back-end folder
    const uploadsDir = path.join(__dirname, '../uploads');
    console.log('Looking for files in:', uploadsDir);

    // Function to search for a file recursively
    function findFileRecursively(dir, filename) {
        let results = [];

        try {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Recursively search subdirectories
                    results = results.concat(findFileRecursively(filePath, filename));
                } else if (file === filename) {
                    // Found the file
                    results.push(filePath);
                    console.log('Found file at:', filePath);
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dir}:`, error);
        }

        return results;
    }

    try {
        const foundFiles = findFileRecursively(uploadsDir, filename);

        if (foundFiles.length > 0) {
            console.log(`Found ${foundFiles.length} matching files. Using first one: ${foundFiles[0]}`);

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            // Send the file
            res.sendFile(foundFiles[0]);
        } else {
            console.log(`No files found matching: ${filename}`);
            res.status(404).send(`File not found: ${filename}`);
        }
    } catch (error) {
        console.error(`Error finding PDF: ${error}`);
        res.status(500).send(`Server error while searching for file: ${error.message}`);
    }
});

route.get('/download_doc/:path/:nom_doc', async function (req, res) {
    try {
        const { path: folderPath, nom_doc } = req.params;
        const fullPath = path.join(__dirname, '..', 'uploads', folderPath, nom_doc);
        
        console.log('Attempting to download document from:', fullPath);
        
        if (!fs.existsSync(fullPath)) {
            console.log('File not found at path:', fullPath);
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({ 
                    error: 'File not available', 
                    message: 'Document exists in database but physical file is not accessible in production environment.' 
                });
            }
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(fullPath, nom_doc, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({ error: 'Error downloading file' });
            }
        });
    } catch (error) {
        console.error('Error in download route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = route
