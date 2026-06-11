import { dlqQueue, taskQueue, dbBufferQueue, cronQueue, QueueName } from "@matcha/queue";
import * as readline from "readline";

const queues: Record<string, any> = {
  [QueueName.TASK]: taskQueue,
  [QueueName.DB_BUFFER]: dbBufferQueue,
  [QueueName.CRON]: cronQueue,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function run() {
  const jobs = await dlqQueue.getJobs(["waiting", "delayed"]);
  
  if (jobs.length === 0) {
    console.log("Dead-Letter Queue is currently empty");
    process.exit(0);
  }

  console.log(`Found ${jobs.length} failed jobs in the DLQ.\n`);
  
  for (const job of jobs) {
    console.log(`[DLQ Job ID]: ${job.id}`);
    console.log(`[Target Queue]: ${job.data.originalQueue}`);
    console.log(`[Task Name]: ${job.name}`);
    console.log(`[Error Reason]: ${job.data.error}`);
    console.log(`[Payload]: ${JSON.stringify(job.data.originalData)}\n`);
    console.log("--------------------------------------------------");
  }

  rl.question("Do you want to replay these jobs to their original active queues? (y/N): ", async (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log("\nReplaying jobs...");
      for (const job of jobs) {
        const targetQueue = queues[job.data.originalQueue];
        if (targetQueue) {
          await targetQueue.add(job.name, job.data.originalData);
          await job.remove();
          console.log(`Replayed ${job.id} into ${job.data.originalQueue}`);
        }
      }
      console.log("\n All jobs replayed successfully! Check the bull-board dashboard.");
    } else {
      console.log("\n Aborted. Jobs left in DLQ.");
    }
    process.exit(0);
  });
}

run().catch(console.error);