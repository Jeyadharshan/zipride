import DocumentService from '../services/documentService.js';
import Logger from '../utils/logger.js';

class DocumentController {
    async getDriverDocuments(req, res, next) {
        try {
            const { profileId } = req.params;
            const document = await DocumentService.getDriverDocumentByProfileId(profileId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver documents not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: document
            });
        } catch (error) {
            Logger.error(`Error fetching driver documents: ${error.message}`);
            next(error);
        }
    }

    async updateVerificationStatus(req, res, next) {
        try {
            const { profileId } = req.params;
            const { status, reason } = req.body;
            const adminId = req.user?.id;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification status is required'
                });
            }

            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification status'
                });
            }

            if (status === 'rejected' && !reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required for rejected status'
                });
            }

            const updatedDocument = await DocumentService.updateVerificationStatus(
                profileId,
                status,
                adminId,
                reason || null
            );

            return res.status(200).json({
                success: true,
                message: `Verification status updated to ${status}`,
                data: updatedDocument
            });
        } catch (error) {
            Logger.error(`Error updating verification status: ${error.message}`);
            next(error);
        }
    }

    async getPendingVerifications(req, res, next) {
        try {
            const documents = await DocumentService.getAllPendingDocuments();

            return res.status(200).json({
                success: true,
                count: documents.length,
                data: documents
            });
        } catch (error) {
            Logger.error(`Error fetching pending verifications: ${error.message}`);
            next(error);
        }
    }

    async getAllVerifications(req, res, next) {
        try {
            const documents = await DocumentService.getAllDocuments();

            return res.status(200).json({
                success: true,
                count: documents.length,
                data: documents
            });
        } catch (error) {
            Logger.error(`Error fetching all verifications: ${error.message}`);
            next(error);
        }
    }
}

export default new DocumentController();
