// This file is intentionally left mostly empty.
// It exists to provide a central entry point if needed and to register module aliases.

// Register module aliases
import './utils/moduleAlias';

// Export handlers for direct imports
export { handler as audioHandler } from './controllers/audio';
export { handler as uploadHandler } from './controllers/upload';
export { handler as downloadHandler } from './controllers/download';
export { handler as trainingHandler } from './controllers/training'; 