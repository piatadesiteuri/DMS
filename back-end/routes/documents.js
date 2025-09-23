// Get all versions of a document
router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;
    const versions = await dbGetDocumentVersions(documentId);
    
    // Get document types for each version
    const versionsWithTypes = await Promise.all(versions.map(async (version) => {
      const type = await dbGetDocumentTypeById(version.type_id);
      return {
        ...version,
        type_name: type ? type.type_name : null
      };
    }));

    res.json(versionsWithTypes);
  } catch (error) {
    console.error('Error fetching document versions:', error);
    res.status(500).json({ error: 'Failed to fetch document versions' });
  }
}); 