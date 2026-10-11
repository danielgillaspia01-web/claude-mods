import { test, expect } from 'claude-code/testing'
import { classify } from '../hooks/register'

test('simple jobs go to the cheap model, real work stays big', async () => {
  expect(classify('fix the typo in README.md').route).toBe('cheap')
  expect(classify('rename these files to lowercase').route).toBe('cheap')
  expect(classify('plan my launch and build the landing page').route).toBe('big')
  expect(classify('debug why the login form fails').route).toBe('big')
  expect(classify('!cheap write a haiku').route).toBe('cheap')
  expect(classify('!cheap write a haiku').text).toBe('write a haiku')
  expect(classify('!big fix the typo').route).toBe('big')
})
