import { projectAsyncJobEventsChannel, projectSeedQueueName } from '../index';

describe('projects contracts', () => {
  it('exposes stable queue and event names', () => {
    expect(projectSeedQueueName).toBe('project-seed');
    expect(projectAsyncJobEventsChannel).toBe('projects.async-job');
  });
});
