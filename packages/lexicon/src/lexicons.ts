/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: 'com.atproto.repo.strongRef',
    description: 'A URI with a content-hash fingerprint.',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
        },
      },
    },
  },
  MeJackhoganGeorgeComment: {
    lexicon: 1,
    id: 'me.jackhogan.george.comment',
    defs: {
      main: {
        type: 'record',
        description: 'A comment on a link, a highlight, or another comment.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['subject', 'text', 'createdAt'],
          properties: {
            subject: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            text: {
              type: 'string',
              maxGraphemes: 3000,
              maxLength: 30000,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  MeJackhoganGeorgeFollow: {
    lexicon: 1,
    id: 'me.jackhogan.george.follow',
    defs: {
      main: {
        type: 'record',
        description:
          "Follow another account; their links and highlights appear in the author's feed.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['subject', 'createdAt'],
          properties: {
            subject: {
              type: 'string',
              format: 'did',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  MeJackhoganGeorgeHighlight: {
    lexicon: 1,
    id: 'me.jackhogan.george.highlight',
    defs: {
      main: {
        type: 'record',
        description:
          'A text highlight on a web page, anchored by a W3C TextQuoteSelector.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['url', 'selector', 'createdAt'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
              description: 'Normalized URL of the page.',
            },
            link: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
              description: "The author's link record for this URL, if any.",
            },
            selector: {
              type: 'ref',
              ref: 'lex:me.jackhogan.george.highlight#textQuoteSelector',
            },
            position: {
              type: 'ref',
              ref: 'lex:me.jackhogan.george.highlight#textPositionSelector',
            },
            note: {
              type: 'string',
              maxGraphemes: 3000,
              maxLength: 30000,
              description: "Author's comment on the highlight.",
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
      textQuoteSelector: {
        type: 'object',
        required: ['exact'],
        properties: {
          exact: {
            type: 'string',
            maxGraphemes: 1500,
            maxLength: 15000,
          },
          prefix: {
            type: 'string',
            maxGraphemes: 150,
            maxLength: 1500,
          },
          suffix: {
            type: 'string',
            maxGraphemes: 150,
            maxLength: 1500,
          },
        },
      },
      textPositionSelector: {
        type: 'object',
        description:
          "Character offsets into the page's text content; a hint, not authoritative.",
        required: ['start', 'end'],
        properties: {
          start: {
            type: 'integer',
            minimum: 0,
          },
          end: {
            type: 'integer',
            minimum: 0,
          },
        },
      },
    },
  },
  MeJackhoganGeorgeLink: {
    lexicon: 1,
    id: 'me.jackhogan.george.link',
    defs: {
      main: {
        type: 'record',
        description:
          'A saved web page. One per normalized URL per repo (enforced by the app).',
        key: 'tid',
        record: {
          type: 'object',
          required: ['url', 'createdAt'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
              description: 'Normalized URL (see @george/shared normalizeUrl).',
            },
            title: {
              type: 'string',
              maxGraphemes: 300,
              maxLength: 3000,
            },
            description: {
              type: 'string',
              maxGraphemes: 1000,
              maxLength: 10000,
            },
            toRead: {
              type: 'boolean',
              default: false,
              description: 'On the reading list rather than saved.',
            },
            favorite: {
              type: 'boolean',
              default: false,
            },
            tags: {
              type: 'array',
              maxLength: 20,
              items: {
                type: 'string',
                maxGraphemes: 64,
                maxLength: 640,
              },
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  MeJackhoganGeorgeProfile: {
    lexicon: 1,
    id: 'me.jackhogan.george.profile',
    defs: {
      main: {
        type: 'record',
        description: "Profile shown in george. Single record keyed 'self'.",
        key: 'literal:self',
        record: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              maxGraphemes: 64,
              maxLength: 640,
            },
            description: {
              type: 'string',
              maxGraphemes: 256,
              maxLength: 2560,
            },
            website: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
            },
            curiusUserLink: {
              type: 'string',
              maxLength: 100,
              description:
                'Curius profile slug this account imported from, for reconnecting friends.',
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  MeJackhoganGeorgeComment: 'me.jackhogan.george.comment',
  MeJackhoganGeorgeFollow: 'me.jackhogan.george.follow',
  MeJackhoganGeorgeHighlight: 'me.jackhogan.george.highlight',
  MeJackhoganGeorgeLink: 'me.jackhogan.george.link',
  MeJackhoganGeorgeProfile: 'me.jackhogan.george.profile',
} as const
