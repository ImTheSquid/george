/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons.js'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util.js'
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'me.jackhogan.george.highlight'

export interface Main {
  $type: 'me.jackhogan.george.highlight'
  /** Normalized URL of the page. */
  url: string
  link?: ComAtprotoRepoStrongRef.Main
  selector: TextQuoteSelector
  position?: TextPositionSelector
  /** Author's comment on the highlight. */
  note?: string
  createdAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}

export interface TextQuoteSelector {
  $type?: 'me.jackhogan.george.highlight#textQuoteSelector'
  exact: string
  prefix?: string
  suffix?: string
}

const hashTextQuoteSelector = 'textQuoteSelector'

export function isTextQuoteSelector<V>(v: V) {
  return is$typed(v, id, hashTextQuoteSelector)
}

export function validateTextQuoteSelector<V>(v: V) {
  return validate<TextQuoteSelector & V>(v, id, hashTextQuoteSelector)
}

/** Character offsets into the page's text content; a hint, not authoritative. */
export interface TextPositionSelector {
  $type?: 'me.jackhogan.george.highlight#textPositionSelector'
  start: number
  end: number
}

const hashTextPositionSelector = 'textPositionSelector'

export function isTextPositionSelector<V>(v: V) {
  return is$typed(v, id, hashTextPositionSelector)
}

export function validateTextPositionSelector<V>(v: V) {
  return validate<TextPositionSelector & V>(v, id, hashTextPositionSelector)
}
