# Polyfills
## Promise
To use this library with IE11 you will need a Promise polyfill.

Use:
```typescript
import { polyfill_Promise } from '@captainpants/zerodeps-multipart-parser';

polyfill_Promise();
```

or
```typescript
import { polyfill_minimum } from '@captainpants/zerodeps-multipart-parser';

polyfill_minimum();
```

## AbortController and AbortSignal
This is required in order to allow aborting http requests in progress. If you are not planning to do this, not targeting IE11 or are using another polyfill you can omit this.

To import:
```typescript
import { polyfill_AbortController } from '@captainpants/zerodeps-multipart-parser';

polyfill_AbortController();
```

This includes a polyfill for EventTarget that currently isn't imported into the global namespace.