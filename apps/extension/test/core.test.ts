import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureTrailingSlash,
  escapeHtml,
  isGiteaUser,
  isNotificationThread,
  isSafeHttpUrl,
  parseRemoteRepository,
  parseServerUrl,
} from '../src/core';

test('parseServerUrl trims input and removes query and fragment', () => {
  assert.equal(parseServerUrl(' https://gitea.example/team/?x=1#top ')?.toString(), 'https://gitea.example/team/');
  assert.equal(parseServerUrl('http://localhost:3000')?.toString(), 'http://localhost:3000/');
});

test('parseServerUrl rejects unsafe or malformed server addresses', () => {
  for (const input of ['', 'ftp://gitea.example', 'file:///tmp/gitea', 'https://user:secret@gitea.example', 'not a url']) {
    assert.equal(parseServerUrl(input), undefined, input);
  }
});

test('ensureTrailingSlash returns a normalized copy', () => {
  const original = new URL('https://gitea.example/base');
  const normalized = ensureTrailingSlash(original);
  assert.equal(normalized.toString(), 'https://gitea.example/base/');
  assert.equal(original.toString(), 'https://gitea.example/base');
});

test('isGiteaUser accepts valid profiles and rejects invalid shapes', () => {
  assert.equal(isGiteaUser({ id: 1, username: 'alice' }), true);
  assert.equal(isGiteaUser({ id: 0, username: 'a' }), true);
  for (const value of [null, [], {}, { id: '1', username: 'alice' }, { id: 1, username: '' }]) {
    assert.equal(isGiteaUser(value), false);
  }
});

test('isSafeHttpUrl allows only absolute HTTP and HTTPS URLs', () => {
  assert.equal(isSafeHttpUrl('https://gitea.example/owner/repo'), true);
  assert.equal(isSafeHttpUrl('http://localhost:3000/path'), true);
  for (const value of ['javascript:alert(1)', 'data:text/plain,x', '//gitea.example/path', 'bad']) {
    assert.equal(isSafeHttpUrl(value), false, value);
  }
});

test('isNotificationThread requires a string or number id', () => {
  assert.equal(isNotificationThread({ id: 0 }), true);
  assert.equal(isNotificationThread({ id: '42' }), true);
  for (const value of [null, {}, { id: null }, { id: {} }]) {
    assert.equal(isNotificationThread(value), false);
  }
});

test('parseRemoteRepository handles HTTPS, SSH and Gitea path prefixes', () => {
  assert.deepEqual(parseRemoteRepository('https://gitea.example/team/project.git'), {
    host: 'gitea.example', pathPrefix: '', owner: 'team', repo: 'project',
  });
  assert.deepEqual(parseRemoteRepository('git@gitea.example:team/project.git'), {
    host: 'gitea.example', pathPrefix: '', owner: 'team', repo: 'project',
  });
  assert.deepEqual(parseRemoteRepository('https://gitea.example/gitea/team/project'), {
    host: 'gitea.example', pathPrefix: '/gitea', owner: 'team', repo: 'project',
  });
});

test('parseRemoteRepository rejects unsupported protocols and incomplete paths', () => {
  for (const remote of ['file:///team/project', 'https://gitea.example/team', 'not a remote']) {
    assert.equal(parseRemoteRepository(remote), undefined, remote);
  }
});

test('escapeHtml encodes every HTML-sensitive character', () => {
  assert.equal(escapeHtml(`<tag attr="x" data='y'>&`), '&lt;tag attr=&quot;x&quot; data=&#39;y&#39;&gt;&amp;');
  assert.equal(escapeHtml('plain text'), 'plain text');
});
