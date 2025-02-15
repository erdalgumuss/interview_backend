import cron from 'node-cron';
import InterviewModel from '../modules/interview/models/interview.model';

export const interviewStatusJob = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('⏳ Checking expired interviews...');

        const now = new Date();
        const expiredInterviews = await InterviewModel.find({
            expirationDate: { $lt: now },
            status: { $ne: 'inactive' },
        });

        for (const interview of expiredInterviews) {
            interview.status = 'inactive';
            await interview.save();
            console.log(`⚠️ Interview ${interview._id} marked as inactive.`);
        }
    });
};
