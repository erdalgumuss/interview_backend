import { FastifyInstance } from 'fastify';
import { addVideoAnalysisJob } from '../modules/queue/addVideoAnalysisJob.ts';

export async function analyzeVideoRoutes(server: FastifyInstance) {
  server.post('/analyzeVideo', async (request, reply) => {


    try {
      const payload = request.body as any;

      if (!payload || !payload.videoUrl || !payload.applicationId) {
        return reply.status(400).send({ error: 'Invalid payload' });
      }

     await addVideoAnalysisJob(payload);

      return reply.send({ status: 'Job added to queue successfully' }); // hızlı cevap
    } catch (error) {
      console.error('Error adding job:', error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
