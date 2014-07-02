#Includes

#Date

	module.exports =
		scope:
			getDate: (result, done) ->
				if result.relativeDay?
					date = new Date()
					date.setHours(0, 0, 0, 0)
					date.setDate(date.getDate() + result.relativeDay)
					done(null, date)
				else
					done(null, new Date())
					
		schema: [
			name: 'dayOfTheWeek'
			root:
				type: 'choice'
				id: '@value'
				children: [
					type: 'Sunday'
					value: 0
				,
					type: 'Monday'
					value: 1
				,
					type: 'Tuesday'
					value: 2
				,
					type: 'Wednesday'
					value: 3
				,
					type: 'Thursday'
					value: 4
				,
					type: 'Friday'
					value: 5
				,
					type: 'Saturday'
					value: 6
				]
		,
			name: 'date'
			evaluate: 'getDate'
			root:
				type: 'choice'
				children: [
					type: 'literal'
					id: 'relativeDay'
					display: 'today'
					value: 0
				,
					type: 'literal'
					id: 'relativeDay'
					display: 'tomorrow'
					value: 1
				,
					type: 'literal'
					id: 'relativeDay'
					display: 'the day after tomorrow'
					value: 2
				,
					type: 'sequence'
					children: [
						'in'
					,
						type: 'integer'
						id: 'relativeDay'
						min: 1
					,
						'days'
					]
				]
		]