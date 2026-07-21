import { EditorView } from '@codemirror/view'

export const azoraTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1A1A1A',
    color: '#D9DADA',
  },
  '.cm-content': {
    caretColor: '#D14EEA',
  },
  '.cm-azls-keyword': {
    color: '#D16B8E',
    fontWeight: '700',
  },
  '.cm-azls-definition, .cm-azls-function': {
    color: '#D4A574',
  },
  '.cm-azls-type': {
    color: '#5FA89F',
  },
  '.cm-azls-string, .cm-azls-char': {
    color: '#7DBF8A',
  },
  '.cm-azls-comment': {
    color: '#676767',
    fontStyle: 'italic',
  },
  '.cm-azls-annotation': {
    color: '#E6C96B',
  },
  '.cm-azls-number': {
    color: '#D9DADA',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#D14EEA',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#4E93EA55 !important',
  },
  '.cm-content ::selection': {
    backgroundColor: '#4E93EA77 !important',
  },
  '.cm-panels': {
    backgroundColor: '#202020',
    color: '#FBFBFB',
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid #313131',
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid #313131',
  },
  '.cm-searchMatch': {
    backgroundColor: '#FFC10744',
    outline: '1px solid #FFC10766',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#4EC96244',
  },
  '.cm-activeLine': {
    backgroundColor: '#2A2A2A',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#4E93EA22',
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#4E93EA44',
  },
  '.cm-gutters': {
    backgroundColor: '#1A1A1A',
    color: '#4C4C4C',
    borderRight: '1px solid #262626',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#262626',
    color: '#9B9B9B',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#313131',
    border: 'none',
    color: '#818181',
  },
  '.cm-tooltip': {
    backgroundColor: '#262626',
    border: '1px solid #313131',
    color: '#FBFBFB',
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: '#313131',
    borderBottomColor: '#313131',
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: '#262626',
    borderBottomColor: '#262626',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: '#4E93EA33',
    },
  },
  '.cm-diagnosticText': {
    fontFamily: 'var(--font-sans)',
  },
}, { dark: true })

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const azoraHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.controlKeyword, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.definitionKeyword, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.moduleKeyword, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.operatorKeyword, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.modifier, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.self, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.processingInstruction, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.operator, color: '#D9DADA' },
  { tag: tags.variableName, color: '#D9DADA' },
  { tag: tags.definition(tags.variableName), color: '#D4A574' },
  { tag: tags.function(tags.variableName), color: '#D4A574' },
  { tag: tags.special(tags.variableName), color: '#D4A574' },
  { tag: tags.propertyName, color: '#D9DADA' },
  { tag: tags.definition(tags.propertyName), color: '#D4A574' },
  { tag: tags.typeName, color: '#5FA89F' },
  { tag: tags.definition(tags.typeName), color: '#5FA89F' },
  { tag: tags.className, color: '#5FA89F' },
  { tag: tags.namespace, color: '#5FA89F' },
  { tag: tags.labelName, color: '#5FA89F' },
  { tag: tags.standard(tags.name), color: '#D4A574' },
  { tag: tags.atom, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.bool, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.null, color: '#D16B8E', fontWeight: 'bold' },
  { tag: tags.number, color: '#D9DADA' },
  { tag: tags.integer, color: '#D9DADA' },
  { tag: tags.float, color: '#D9DADA' },
  { tag: tags.string, color: '#7DBF8A' },
  { tag: tags.character, color: '#7DBF8A' },
  { tag: tags.regexp, color: '#7DBF8A' },
  { tag: tags.meta, color: '#E6C96B' },
  { tag: tags.annotation, color: '#E6C96B' },
  { tag: tags.comment, color: '#676767' },
  { tag: tags.lineComment, color: '#676767' },
  { tag: tags.blockComment, color: '#676767' },
  { tag: tags.docComment, color: '#676767' },
  { tag: tags.punctuation, color: '#D9DADA' },
  { tag: tags.paren, color: '#D9DADA' },
  { tag: tags.brace, color: '#D9DADA' },
  { tag: tags.squareBracket, color: '#D9DADA' },
  { tag: tags.separator, color: '#D9DADA' },
  { tag: tags.invalid, color: '#E63946' },
])

export const azoraHighlight = syntaxHighlighting(azoraHighlightStyle)
