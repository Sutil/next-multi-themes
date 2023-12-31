import { act, render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../src'
import React, { useEffect } from 'react'

let localStorageMock: { [key: string]: string } = {}

// HelperComponent to render the theme inside a paragraph-tag and setting a theme via the forceSetTheme prop
const HelperComponent = ({ forceSetTheme }: { forceSetTheme?: string }) => {
  const { setTheme, themeMode, theme, forcedTheme, resolvedTheme, systemTheme } = useTheme()

  useEffect(() => {
    if (forceSetTheme) {
      setTheme(forceSetTheme)
    }
  }, [forceSetTheme])

  console.log('helper>>', themeMode, theme, forcedTheme)

  return (
    <>
      <p data-testid="theme-mode">{themeMode}</p>
      <p data-testid="theme">{theme}</p>
      <p data-testid="forcedTheme">{forcedTheme}</p>
      <p data-testid="resolvedTheme">{resolvedTheme}</p>
      <p data-testid="systemTheme">{systemTheme}</p>
    </>
  )
}

function setDeviceTheme(theme: 'light' | 'dark') {
  // Create a mock of the window.matchMedia function
  // Based on: https://stackoverflow.com/questions/39830580/jest-test-fails-typeerror-window-matchmedia-is-not-a-function
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: theme === 'dark' ? true : false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  })
}

beforeAll(() => {
  // Create mocks of localStorage getItem and setItem functions
  global.Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key])
  global.Storage.prototype.setItem = jest.fn((key: string, value: string) => {
    localStorageMock[key] = value
  })
})

beforeEach(() => {
  // Reset global side-effects
  setDeviceTheme('light')
  document.documentElement.style.colorScheme = ''
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('class')

  // Clear the localStorage-mock
  localStorageMock = {}
})

describe('defaultTheme', () => {
  test('should return system when no default-theme is set', () => {
    render(
      <ThemeProvider>
        <HelperComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode').textContent).toBe('system')
  })

  test('should return light when no default-theme is set and enableSystem=false', () => {
    render(
      <ThemeProvider enableSystem={false}>
        <HelperComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode').textContent).toBe('light')
  })

  test('should return light when light is set as default-theme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <HelperComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode').textContent).toBe('light')
  })

  test('should return dark when dark is set as default-theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <HelperComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode').textContent).toBe('dark')
  })
})

describe('provider', () => {
  it('ignores nested ThemeProviders', () => {
    act(() => {
      render(
        <ThemeProvider defaultTheme="dark">
          <ThemeProvider defaultTheme="light">
            <HelperComponent />
          </ThemeProvider>
        </ThemeProvider>
      )
    })

    expect(screen.getByTestId('theme-mode').textContent).toBe('dark')
  })
})

describe('storage', () => {
  test('should not set localStorage with default value', () => {
    act(() => {
      render(
        <ThemeProvider defaultTheme="dark">
          <HelperComponent />
        </ThemeProvider>
      )
    })

    expect(global.Storage.prototype.setItem).toBeCalledTimes(0)
    expect(global.Storage.prototype.getItem('theme')).toBeUndefined()
  })

  test('should set localStorage when switching themes', () => {
    act(() => {
      render(
        <ThemeProvider>
          <HelperComponent forceSetTheme="dark" />
        </ThemeProvider>
      )
    })

    expect(global.Storage.prototype.setItem).toBeCalledTimes(1)
    expect(global.Storage.prototype.getItem('theme-mode')).toBe('dark')
  })
})

describe('custom storageKey', () => {
  test("should save to localStorage with 'theme' key when using default settings", () => {
    act(() => {
      render(
        <ThemeProvider>
          <HelperComponent forceSetTheme="light" />
        </ThemeProvider>
      )
    })

    expect(global.Storage.prototype.getItem).toHaveBeenCalledWith('theme')
    expect(global.Storage.prototype.setItem).toHaveBeenCalledWith('theme-mode', 'light')
  })

  test("should save to localStorage with 'custom' when setting prop 'storageKey' to 'customKey'", () => {
    act(() => {
      render(
        <ThemeProvider storageModeKey="customKey">
          <HelperComponent forceSetTheme="light" />
        </ThemeProvider>
      )
    })

    expect(global.Storage.prototype.getItem).toHaveBeenCalledWith('customKey')
    expect(global.Storage.prototype.setItem).toHaveBeenCalledWith('customKey', 'light')
  })
})

describe('custom attribute', () => {
  test('should use data-theme attribute when using default', () => {
    act(() => {
      render(
        <ThemeProvider>
          <HelperComponent forceSetTheme="light" />
        </ThemeProvider>
      )
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('should use class attribute (CSS-class) when attribute="class"', () => {
    act(() => {
      render(
        <ThemeProvider attribute="class">
          <HelperComponent forceSetTheme="light" />
        </ThemeProvider>
      )
    })

    expect(document.documentElement.classList.contains('light')).toBeTruthy()
  })

  test('should use "data-example"-attribute when attribute="data-example"', () => {
    act(() => {
      render(
        <ThemeProvider attribute="data-example">
          <HelperComponent forceSetTheme="light" />
        </ThemeProvider>
      )
    })

    expect(document.documentElement.getAttribute('data-example')).toBe('light')
  })
})

describe('forcedTheme', () => {
  test('should render saved theme when no forcedTheme is set', () => {
    localStorageMock['theme'] = 'dark'

    render(
      <ThemeProvider>
        <HelperComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(screen.getByTestId('forcedTheme').textContent).toBe('')
  })

  test('should render light theme when forcedTheme is set to light', () => {
    localStorageMock['theme'] = 'dark'

    act(() => {
      render(
        <ThemeProvider forcedTheme="light">
          <HelperComponent />
        </ThemeProvider>
      )
    })

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(screen.getByTestId('forcedTheme').textContent).toBe('light')
  })
})

describe('system', () => {
  test('resolved theme should be set', () => {
    setDeviceTheme('dark')

    act(() => {
      render(
        <ThemeProvider>
          <HelperComponent />
        </ThemeProvider>
      )
    })

    expect(screen.getByTestId('theme-mode').textContent).toBe('system')
    expect(screen.getByTestId('forcedTheme').textContent).toBe('')
    expect(screen.getByTestId('resolvedTheme').textContent).toBe('')
  })

  test('system theme should be set, even if theme is not system', () => {
    setDeviceTheme('dark')

    act(() => {
      render(
        <ThemeProvider defaultTheme='light' >
          <HelperComponent />
        </ThemeProvider>
      )
    })

    expect(screen.getByTestId('theme-mode').textContent).toBe('light')
    expect(screen.getByTestId('forcedTheme').textContent).toBe('')
    expect(screen.getByTestId('resolvedTheme').textContent).toBe('')
    expect(screen.getByTestId('systemTheme').textContent).toBe('dark')
  })

})

describe('color-scheme', () => {
  test('does not set color-scheme when disabled', () => {
    act(() => {
      render(
        <ThemeProvider enableColorScheme={false}>
          <HelperComponent />
        </ThemeProvider>
      )
    })

    expect(document.documentElement.style.colorScheme).toBe('')
  })

  test('should set color-scheme light when light theme is active', () => {
    act(() => {
      render(
        <ThemeProvider enableSystem={false}>
          <HelperComponent />
        </ThemeProvider>
      )
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  test('should set color-scheme dark when dark theme is active', () => {
    act(() => {
      render(
        <ThemeProvider defaultTheme="dark">
          <HelperComponent forceSetTheme="dark" />
        </ThemeProvider>
      )
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
