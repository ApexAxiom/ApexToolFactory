import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'pestimatorAttachments',
  access: (allow) => ({
    'private/{entity_id}/pestimator/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ]
  })
});
