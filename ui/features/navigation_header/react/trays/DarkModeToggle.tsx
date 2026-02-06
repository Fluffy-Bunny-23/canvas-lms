/*
 * Copyright (C) 2026 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import {useScope as createI18nScope} from '@canvas/i18n'
import {bool} from 'prop-types'
import React, {useEffect, useState, useRef} from 'react'
import doFetchApi from '@canvas/do-fetch-api-effect'
import {showFlashAlert} from '@canvas/alerts/react/FlashAlert'
import {View} from '@instructure/ui-view'
import {Text} from '@instructure/ui-text'
import {Spinner} from '@instructure/ui-spinner'
import {Tooltip} from '@instructure/ui-tooltip'
import {Checkbox} from '@instructure/ui-checkbox'
import {IconButton} from '@instructure/ui-buttons'
import {IconInfoLine} from '@instructure/ui-icons'

const I18n = createI18nScope('ProfileTray')

type DarkModeLabelProps = {
  loading: boolean
  isMobile: boolean
}

type TipTrigger = 'click' | 'hover' | 'focus'

const DarkModeLabel = ({loading, isMobile}: DarkModeLabelProps) => {
  const labelText = isMobile ? I18n.t('Dark Mode') : I18n.t('Use Dark Mode')
  const mobileTipText = I18n.t('Use dark color theme')
  const desktopTipText = I18n.t('Reduces screen brightness and uses a dark color theme across Canvas')
  const tipText = isMobile ? mobileTipText : desktopTipText
  const tipTriggers: TipTrigger[] = ['click']

  // Show a spinner after a delay in case API calls take an excessive amount of time,
  // but only do this in development or production environments, not in tests
  const spinnerDelay =
    process.env.NODE_ENV === 'test' || typeof process.env.NODE_ENV === 'undefined' ? undefined : 300

  if (!isMobile) {
    tipTriggers.push('hover')
    tipTriggers.push('focus')
  }

  const [tipTextState, setTipTextState] = useState(tipText)

  const handleResize = () => {
    if (window.devicePixelRatio >= 4) {
      setTipTextState(mobileTipText)
    } else if (window.devicePixelRatio < 4 && !isMobile) {
      setTipTextState(desktopTipText)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <View as="span">
      <Text>{labelText}</Text>
      <Tooltip renderTip={tipTextState} on={tipTriggers} placement="bottom start">
        <IconButton
          renderIcon={IconInfoLine}
          size="small"
          margin="none none xx-small xx-small"
          withBackground={false}
          withBorder={false}
          screenReaderLabel={I18n.t('Toggle tooltip')}
        />
      </Tooltip>
      {loading && (
        <Spinner
          delay={spinnerDelay}
          data-testid="dark-mode-change-spinner"
          size="x-small"
          renderTitle={I18n.t('Waiting for change to complete')}
          margin="none none xx-small none"
        />
      )}
    </View>
  )
}

DarkModeLabel.propTypes = {
  loading: bool.isRequired,
  isMobile: bool.isRequired,
}

type DarkModeToggleProps = {
  isMobile: boolean
}

export default function DarkModeToggle({isMobile}: DarkModeToggleProps) {
  const originalSetting = useRef(ENV.prefers_dark_mode)
  const [enabled, setEnabled] = useState(ENV.prefers_dark_mode ?? false)
  const [loading, setLoading] = useState(false)
  const path = `/api/v1/users/${ENV.current_user_id}/features/flags/dark_mode`
  const changed = originalSetting.current !== enabled
  const margins = isMobile ? 'none none none small' : 'none'

  // Toggles the dark_mode feature flag to the opposite state from where it
  // is currently at. Note that this only updates the back-end and the current page
  // will remain on the old setting until a new Canvas page load happens (or this
  // page is manually reloaded by the user), so the currently loaded CSS and thus
  // the dark mode state of the browser screen will be out of sync with the persistence
  // layer until that happens.
  async function toggleDarkMode() {
    const newState = enabled ? 'off' : 'on'
    setLoading(true)
    try {
      const {json} = await doFetchApi<{feature: string; state: string}>({
        path,
        method: 'PUT',
        body: {feature: 'dark_mode', state: newState},
      })
      if (json?.feature !== 'dark_mode') throw new Error('Unexpected response from API call')
      setEnabled(json.state === 'on')
      ;(ENV as {prefers_dark_mode: boolean}).prefers_dark_mode = json.state === 'on'
    } catch (err) {
      if (err instanceof Error) {
        showFlashAlert({
          message: I18n.t('An error occurred while trying to change the UI'),
          err,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View as="div" margin={margins} data-testid="dark-mode-toggle">
      <Checkbox
        variant="toggle"
        size="small"
        label={<DarkModeLabel loading={loading} isMobile={isMobile} />}
        checked={enabled}
        readOnly={loading}
        onChange={toggleDarkMode}
        aria-describedby={changed ? 'dark-mode-toggle-explainer' : undefined}
      />
      {changed && (
        <Text id="dark-mode-toggle-explainer" size="small">
          {I18n.t('Reload the page or navigate to a new page for this change to take effect.')}
        </Text>
      )}
    </View>
  )
}

DarkModeToggle.defaultProps = {
  isMobile: false,
}
