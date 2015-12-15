/** @jsx createElement */

import _ from 'lodash'
import moment from 'moment'
import { createElement, Phrase } from 'lacona-phrase'
import { DigitString, Integer } from 'lacona-phrase-number'
import { TimeDuration } from './duration'

export class TimeOfDay extends Phrase {
  describe () {
    return (
    <placeholder text='time of day'>
      <list items={[
        {text: 'morning', value: {default: 8, range: [0, 12]}},
        {text: 'afternoon', value: {default: 12, range: [12, 24]}},
        {text: 'evening', value: {default: 17, range: [12, 24]}},
        {text: 'night', value: {default: 20, range: [12, 24]}}
      ]} />
      </placeholder>
    )
  }
}

export class AmbiguousTime extends Phrase {
  describe () {
    return (
      <sequence>
        {this.props.prepositions ? <literal text='at ' category='conjunction' /> : null}
        <argument text='time' showForEmpty merge>
          <Absolute merge ampm={false} named={false} timeOfDay={false} />
        </argument>
      </sequence>
    )
  }
}

function timeFromAbsolute (absolute) {
    let hour = absolute.hour

    if (absolute.ampm) {
      hour = absolute.ampm === 'am' ? (hour === 12 ? 0 : hour) : hour + 12
    }

    return {hour, minute: absolute.minute || 0}
}

function timeFromRelative (duration, now) {
  const localTime = moment(now)
  const noTimeZoneLocalTime = moment.utc({hour: localTime.hour(), minute: localTime.minute()})
  const newTime = noTimeZoneLocalTime.add(moment.duration(duration))
  return {hour: newTime.hour(), minute: newTime.minute()}
}

export class Time extends Phrase {
  getValue (result) {
    if (!result) return

    if (result.recursive) {
      return timeFromRelative(result.recursive.duration, result.recursive.time)
    } else if (result.relative) {
      return timeFromRelative(result.relative)
    } else if (result.absolute) {
      return timeFromAbsolute(result.absolute)
    }
  }

  describe () {
    return (
      <argument text='time' showForEmpty={true} merge={true}>
        <choice>
          <sequence>
            {this.props.prepositions ? <literal text='at ' category='conjunction' /> : null}
            <Absolute id='absolute' />
          </sequence>
          {this.props.relative ? <RelativeTime id='relative' /> : null}
          {this.props.recurse ? <RecursiveTime id='recursive' /> : null}
        </choice>
      </argument>
    )
  }
}

Time.defaultProps = {
  recurse: true,
  relative: true,
  prepositions: false,
  seconds: false
}

class RelativeTime extends Phrase {
  getValue(result) {
    if (!result) return

    if (result.direction < 0) {
      return _.mapValues(result.duration, num => -num)
    } else {
      return result.duration
    }
  }

  describe() {
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

class AbsoluteRelativeHour extends Phrase {
  getValue (result) {
    if (!result || !result.absolute) return

    if (result.direction > 0) {
      return {hour: result.absolute.hour, minute: result.minute, ampm: result.absolute.ampm}
    } else {
      const hour = result.absolute.hour === 0 ? 23 : result.absolute.hour - 1
      const minute = 60 - result.minute
      return {hour, minute, ampm: result.absolute.ampm}
    }
  }

  describe () {
    return (
      <sequence>
        <placeholder text='number' showForEmpty={true} id='minute'>
          <choice>
            <literal text='quarter' value={15} />
            <literal text='half' value={30}/>
            <sequence>
              <Integer min={1} max={59} merge={true} />
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
        <placeholder text='hour' id='absolute'>
          <choice>
            <AbsoluteNumeric minutes={false} ampm={this.props.ampm} />
            <AbsoluteNamed />
          </choice>
        </placeholder>
      </sequence>
    )
  }
}

class Absolute extends Phrase {
  describe() {
    return (
      <choice>
        <AbsoluteNumeric ampm={this.props.ampm} />
        <AbsoluteRelativeHour ampm={this.props.ampm} />
        {this.props.named ? <AbsoluteNamed /> : null}
        {this.props.timeOfDay ? <AbsoluteTimeOfDay /> : null}
      </choice>
    )
  }
}

Absolute.defaultProps = {
  ampm: true,
  named: true,
  timeOfDay: true
}

class AbsoluteTimeOfDay extends Phrase {
  getValue (result) {
    if (!result || !result.absolute || !result.timeOfDay) return

    if (_.inRange(result.absolute.hour, ...result.timeOfDay.range)) {
      return result.absolute
    } else {
      return {hour: result.absolute.hour < 12 ? result.absolute.hour + 12 : result.absolute.hour - 12, minute: result.absolute.minute}
    }
  }

  describe () {
    return (
      <sequence>
        <choice id='absolute'>
          <AbsoluteNumeric ampm={false} />
          <AbsoluteRelativeHour ampm={false} />
        </choice>
        <literal text=' in the ' category='conjunction' />
        <TimeOfDay id='timeOfDay' />
      </sequence>
    )
  }
}

class AbsoluteNamed extends Phrase {
  getValue (result) {
    return {hour: result, minute: 0}
  }

  describe () {
    return <list items={[
      {text: 'midnight', value: 0},
      {text: 'noon', value: 12}
    ]} />
  }
}

class AbsoluteNumeric extends Phrase {
  getValue (result) {
    return {hour: parseInt(result.hour, 10), minute: result.minute, ampm: result.ampm}
  }

  describe () {
    return (
      <sequence>
        <DigitString descriptor='hour' min={1} max={12} allowLeadingZeros={false} id='hour' />

        {this.props.minutes ?
          <sequence id='minute' optional>
            <literal text=':' />
            <Minutes merge />
          </sequence>
        : null }

        {this.props.ampm ?
          <choice id='ampm'>
            <list items={[' am', 'am', ' a', 'a', ' a.m.', 'a.m.', ' a.m', 'a.m']} value='am' limit={1} />
            <list items={[' pm', 'pm', ' p', 'p', ' p.m.', 'p.m.', ' p.m', 'p.m']} value='pm' limit={1} />
          </choice>
        : null}
      </sequence>
    )
  }
}

AbsoluteNumeric.defaultProps = {minutes: true}

class RecursiveTime extends Phrase {
  getValue (result) {
    if (!result || !result.time || !result.duration || !result.direction) return

    let duration = result.duration
    if (result.direction === -1) {
      duration = _.mapValues(result.duration, item => -item)
    }

    return {time: result.time, duration}
  }

  describe () {
    return (
      <sequence>
        <argument text='offset' showForEmpty merge>
          <sequence>
            <TimeDuration id='duration' />
            <list merge={true} id='direction' items={[
              {text: ' before ', value: -1},
              {text: ' after ', value: 1},
              {text: ' from ', value: 1},
              {text: ' past ', value: 1},
              {text: ' to ', value: -1},
              {text: ' of ', value: -1},
              {text: ' til ', value: -1},
              {text: ' from ', value: -1}
            ]} limit={2} />
          </sequence>
        </argument>
        <Time recurse={false} relative={false} id='time' />
      </sequence>
    )
  }
}

class Minutes extends Phrase {
  getValue(result) {
    return parseInt(result, 10)
  }

  describe() {
    return <DigitString descriptor='minutes' max={59} minLength={2} maxLength={2} />
  }
}
