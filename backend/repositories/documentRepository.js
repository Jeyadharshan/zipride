import fs from 'fs';
import path from 'path';
import { getDB, isDBConnected } from '../config/mongodb.js';

class DocumentRepository {
    constructor() {
        this.collectionName = 'driver_documents';
        this.fallbackPath = path.resolve('data/mongo_mock.json');
    }

    async getCollection() {
        if (!isDBConnected()) return null;
        const db = getDB();
        return db.collection(this.collectionName);
    }

    async readFallback() {
        try {
            const dir = path.dirname(this.fallbackPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (!fs.existsSync(this.fallbackPath)) {
                return {};
            }
            const content = fs.readFileSync(this.fallbackPath, 'utf8');
            return JSON.parse(content || '{}');
        } catch (error) {
            console.error('[DocumentRepository Fallback] Read failed:', error.message);
            return {};
        }
    }

    async writeFallback(data) {
        try {
            const dir = path.dirname(this.fallbackPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.fallbackPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('[DocumentRepository Fallback] Write failed:', error.message);
        }
    }

    async save(document) {
        const collection = await this.getCollection();
        if (collection) {
            return await collection.updateOne(
                { profileId: document.profileId },
                { $set: { ...document, updatedAt: new Date() } },
                { upsert: true }
            );
        }

        // Fallback JSON implementation
        const data = await this.readFallback();
        data[document.profileId] = {
            ...data[document.profileId],
            ...document,
            updatedAt: new Date().toISOString()
        };
        await this.writeFallback(data);
        return { acknowledged: true, upsertedId: document.profileId };
    }

    async findByProfileId(profileId) {
        const collection = await this.getCollection();
        if (collection) {
            return await collection.findOne({ profileId });
        }

        // Fallback JSON implementation
        const data = await this.readFallback();
        return data[profileId] || null;
    }

    async findByDriverId(driverId) {
        const collection = await this.getCollection();
        if (collection) {
            return await collection.findOne({ driverId });
        }

        // Fallback JSON implementation
        const data = await this.readFallback();
        return Object.values(data).find(doc => doc.driverId === driverId) || null;
    }

    async updateStatus(profileId, status, approvedBy = null, rejectedReason = null) {
        const collection = await this.getCollection();
        if (collection) {
            const updateData = {
                verificationStatus: status,
                updatedAt: new Date()
            };

            if (status === 'approved') {
                updateData.approvedBy = approvedBy;
                updateData.approvedAt = new Date();
            } else if (status === 'rejected') {
                updateData.rejectedReason = rejectedReason;
            }

            return await collection.updateOne(
                { profileId },
                { $set: updateData }
            );
        }

        // Fallback JSON implementation
        const data = await this.readFallback();
        if (data[profileId]) {
            data[profileId].verificationStatus = status;
            data[profileId].updatedAt = new Date().toISOString();
            if (status === 'approved') {
                data[profileId].approvedBy = approvedBy;
                data[profileId].approvedAt = new Date().toISOString();
            } else if (status === 'rejected') {
                data[profileId].rejectedReason = rejectedReason;
            }
            await this.writeFallback(data);
        }
        return { acknowledged: true };
    }

    async getAll() {
        const collection = await this.getCollection();
        if (collection) {
            return await collection.find({}).toArray();
        }

        // Fallback JSON implementation
        const data = await this.readFallback();
        return Object.values(data);
    }

    async deleteByProfileId(profileId) {
        const collection = await this.getCollection();
        if (collection) {
            return await collection.deleteOne({ profileId });
        }

        // Fallback JSON implementation
        const data = await this.readFallback();
        if (data[profileId]) {
            delete data[profileId];
            await this.writeFallback(data);
        }
        return { acknowledged: true };
    }
}

export default new DocumentRepository();
