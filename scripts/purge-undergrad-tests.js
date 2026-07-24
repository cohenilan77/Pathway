// node scripts/purge-undergrad-tests.js  — run this before real users touch it.
// Removes every __test__ undergrad student: state, session transcript buffer,
// and active-set membership.
import { getStore } from '../lib/store.js';
import { ACTIVE_SET_KEY } from '../lib/undergrad/state.js';

const store = getStore();

const ids = (await store.smembers(ACTIVE_SET_KEY)) || [];
for (const id of ids.filter(i => String(i).startsWith('__test__'))) {
  await store.del(`user:${id}:undergrad`);
  await store.del(`undergrad:transcript:${id}`);
  await store.srem(ACTIVE_SET_KEY, id);
  console.log('purged', id);
}
