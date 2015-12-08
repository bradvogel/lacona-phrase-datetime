/** @jsx createElement */

import _ from 'lodash'
import {createElement, Phrase} from 'lacona-phrase'
import {DigitString, Integer} from 'lacona-phrase-number'
import {TimeDuration} from './duration'

export default class Time extends Phrase {
  getValue (result) {
    if (!result) return

    if (_.isDate(result)) {
      return result
    } else if (result.relative) {
      const date = new Date()
      if (!_.isUndefined(result.relative.hours)) date.setHours(date.getHours() + result.relative.hours)
      if (!_.isUndefined(result.relative.minutes)) date.setMinutes(date.getMinutes() + result.relative.minutes)
      if (this.props.seconds && !_.isUndefined(result.relative.seconds)) {
        date.setSeconds(date.getSeconds() + result.relative.seconds)
      } else {
        date.setSeconds(0)
      }
      date.setMilliseconds(0)

      return date
    } else if (result.absolute) {
      const date = new Date()
      date.setHours(result.absolute.hour, result.absolute.minute || 0, 0, 0)
      return date
    }
  }
}

Time.translations = [{
  langs: ['en_US', 'default'],
  describe () {
    return (
      <sequence>
        <argument text='time' showForEmpty={true} merge={true}>
          <choice>
            <literal text='midnight' id='absolute' value={{hour: 0}} />
            <literal text='noon' id='absolute' value={{hour: 12}} />
            <AbsTime minutes={true} id='absolute'  />
            <AbsTimeFancy />
            {this.props.relative ? <RelativeTime id='relative' /> : null}
            {this.props.recurse ? <RecursiveTime /> : null}
          </choice>
        </argument>
      </sequence>
    )
  }
}]

Time.defaultProps = {
  recurse: true,
  relative: true,
  seconds: false
}

class RelativeTime extends Phrase {
  getValue (result) {
    if (!result) return

    if (result.direction < 0) {
      return _.mapValues(result.duration, num => -num)
    } else {
      return result.duration
    }
  }

  describe () {
    return (
      <choice>
        <sequence>
          <literal text='in ' id='direction' value={1} />
          <TimeDuration id='duration' seconds={this.props.seconds} />
        </sequence>
        <sequence>
          <TimeDuration id='duration' seconds={this.props.seconds} />
          <literal text=' from now' id='direction' value={1} />
        </sequence>
        <sequence>
          <TimeDuration id='duration' seconds={this.props.seconds} />
          <literal text=' ago' id='direction' value={-1} />
        </sequence>
      </choice>
    )
  }
}

class AbsTimeFancy extends Phrase {
  getValue (result) {
    if (!result) return
    const date = new Date()

    if (result.direction > 0) {
      date.setHours(result.hour, result.minutes, 0, 0)
    } else {
      const hour = result.hour === 0 ? 23 : result.hour - 1
      const minutes = 60 - result.minutes
      date.setHours(hour, minutes, 0, 0)
    }
    return date
  }

  describe () {
    return (
      <sequence>
        <placeholder text='number' showForEmpty={true} id='minutes'>
          <choice>
            <literal text='quarter' value={15} />
            <literal text='half' value={30}/>
            <sequence>
              <Integer min={1} max={59} merge={true} />
              <literal optional={true} text=' minutes'/>
            </sequence>
          </choice>
        </placeholder>
        <choice id='direction'>
          <choice limit={1} value={1}>
            <literal text=' past '/>
          </choice>
          <choice limit={1} value={-1}>
            <literal text=' to ' />
            <literal text=' of ' />
            <literal text=' til ' />
            <literal text=' before ' />
            <literal text=' from '/>
          </choice>
        </choice>
        <placeholder text='hour' merge={true}>
          <choice>
            <AbsTime minutes={false} />
            <literal text='midnight' value={{hour: 0, minute: 0}} />
            <literal text='noon' value={{hour :12, minute: 0}} />
          </choice>
        </placeholder>
      </sequence>
    )
  }
}


class AbsTime extends Phrase {
  getValue (result) {
    let hour = parseInt(result.hour)

    if (result.ampm) {
      hour = result.ampm === 'am' ? (hour === 12 ? 0 : hour) : hour + 12
    }

    const minute = result.minutes ? parseInt(result.minutes, 10) : 0

    return {hour, minute}
  }

  describe () {
    return (
      <sequence>
        <DigitString descriptor='hour' min={1} max={12} allowLeadingZeros={false} id='hour' />
        {this.props.minutes ?
          <sequence id='minutes' optional={true} preffered={false}>
            <literal text=':' />
            <Minutes merge={true} />
          </sequence> :
          null
        }
        <choice id='ampm'>
          <list items={[' am', 'am', ' a', 'a', ' a.m.', 'a.m.', ' a.m', 'a.m']} value='am' limit={1} />
          <list items={[' pm', 'pm', ' p', 'p', ' p.m.', 'p.m.', ' p.m', 'p.m']} value='pm' limit={1} />
        </choice>
      </sequence>
    )
  }
}
AbsTime.defaultProps = {minutes: true}

class RecursiveTime extends Phrase {
  getValue (result) {
    if (!result || !result.time) return

    const date = new Date(result.time.getTime()) //clone date

    if (result.hours) {
      date.setHours((result.hours * result.direction) + result.time.getHours())
    }

    if (result.minutes) {
      date.setMinutes((result.minutes * result.direction) + result.time.getMinutes())
    }

    if (result.seconds) {
      date.setSeconds((result.seconds * result.direction) + result.time.getSeconds())
    }

    return date
  }

  describe () {
    return (
      <sequence>
        <argument text='offset' showForEmpty={true} merge={true}>
          <sequence>
            <TimeDuration merge={true} />
            <list merge={true} id='direction' items={[
                {text: ' before ', value: -1},
                {text: ' after ', value: 1},
                {text: ' from ', value: 1}
              ]} limit={2} />
          </sequence>
        </argument>
        <Time recurse={false} relative={false} id='time' />
      </sequence>
    )
  }
}

class Minutes extends Phrase {
  describe () {
    return <DigitString descriptor='minutes' max={59} minLength={2} maxLength={2} />
  }
}