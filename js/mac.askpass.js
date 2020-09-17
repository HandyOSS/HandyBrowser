#!/usr/bin/env osascript -l JavaScript

/* eslint-disable */

ObjC.import('stdlib')

const app = Application.currentApplication()
app.includeStandardAdditions = true

const result = app.displayDialog('Enter your password to add HandyBrowser Certificate "DNSSEC" to Keychain.', {
  defaultAnswer: '',
  withIcon: 'stop',
  buttons: ['Cancel', 'Ok'],
  defaultButton: 'Ok',
  hiddenAnswer: true,
})

if (result.buttonReturned === 'Ok') {
  result.textReturned
} else {
  $.exit(255)
}