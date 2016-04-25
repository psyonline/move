# move.js v.0.1.3

Simple javascript library for move elements.


## options

###### # 이동 할 때 CSS 클래스명(body에 추가 됨).
__classongrabbing__: string, default: 'grabbing'

###### # 방향
__direction__: 'x' | 'y' | 'x,y' | 'auto' | 'free', default: 'auto'

###### # CSS Transform 사용 여부
__usetransform__: '3d' | '2d' | false, default: '3d', set false to use 'left, top'

###### # 사용하지 않는 방향 또는 경계에서 터치를 막을 것인지 여부
__preventtouches__: boolean, default: true

###### # 던지는 효과 사용 여부
__throwable__: boolean, default: true

###### # 경계를 벗어날 것인지 여부
__outofbounds__: boolean, default: true

###### # 경계 지정
__bounds__: element | array[x, y, width, height], default: null

###### # 위치 고정 여부(함수인 경우 값을 전달 받아서 고정할 위치를 return 해야함)
__snap__: number | function(gets destination value, return snaped value)
	or array[x(number|function), y(number|function)]
	or {x: number|function, y: number|function},
	default: null

###### # 애니매이션 사용 여부
__animate__: boolean, default: true

###### # 최소 애니매이션 시간
__minduration__: number, default: 500

###### # 최대 애니매이션 시간
__maxduration__: number, default: 1750

###### # 실제 이동 없이 값만 사용할 것인지 여부
__valuesonly__: boolean, default: false

###### # 스크롤 모드. 값이 있으면 사용으로 처리
__scroll__: {
###### - 휠을 가로 스크롤로 사용할 것인지 여부
__wheelforx__: boolean, default: false
###### - 사용하지 않는 방향 또는 경계에서 휠을 막을 것인지 여부
__preventwheels__: boolean, default: true
###### - 휠 애니매이션 사용 여부
wheelanimate: boolean, default: true

}

###### # 스케일 기능. 값이 있으면 사용으로 처리
__scale__: {
###### - 첫 표시 스케일
__initial__: number, default: 1
###### - 최소 스케일
__min__: number, default: 1
###### - 최대 스케일
__max__: number, default: 1

}



## events

###### # 공통 event 값
__event__ = {
	"type": "reset | move | moveend",
	"x": 0~,
	"y": 0~,
	"max": {
		"x": 0~,
		"y": 0~
	},
	"percent": { // now/(max-min)
		"x": 0~1,
		"y": 0~1
	}
}

###### # .reset() 함수 실행 시 발생
__onreset__: function(event)

###### # 움직일 때마다 발생
__onmove__: function(event)

###### # 움직임이 끝날 때 발생
__onmoveend__: function(event)

###### # 던질 때 발생(공통 event 값에 destination(최종위치) 속성이 추가됨)
__onthrow__: function(event)
	event = {
		"type": "throw",
		...
		"destination": {
			"x": 0~,
			"y": 0~
		}
	}


## return

###### # x 이동
__left__: function(x, withoutanimation)
	- x: 이동할 x 값, number, 값이 없으면 현재 x 값 return
	- withoutanimation: 애니매이션 사용 여부, boolean, default: true(option의 useanimation이 우선)

###### # y 이동
__top__: function(y, withoutanimation)
	- y: 이동할 y 값, number, 값이 없으면 현재 y 값 return
	- withoutanimation: 애니매이션 사용 여부, boolean, default: true(option의 useanimation이 우선)

###### # x, y 이동
__to__: function(x, y, withoutanimation)
	- x: 이동할 x 값, number
	- y: 이동할 y 값, number
	- withoutanimation: 애니매이션 사용 여부, boolean, default: true(option의 useanimation이 우선)

###### # scale 변경
__scale__: function(value, percentx, percenty, withoutanimation)
	- value: 변경할 scale 값, number, 값이 없으면 현재 scale 값 return
	- percentx: 확대/축소 후 화면상 중앙에 위치할 x 지점의 현재 화면상 percent, float, 기본값: 0.5
	- percenty: 확대/축소 후 화면상 중앙에 위치할 y 지점의 현재 화면상 percent, float, 기본값: 0.5
	- withoutanimation: 애니매이션 사용 여부, boolean, default: true(option의 useanimation이 우선)

###### # scroll 기능 활성
__enable__: function()

###### # scroll 기능 비활성
__disable__: function()

###### # reset, 사이즈 변경 등 지정 후 실행.
__reset__: function()

###### # ??
__set__: function(target)


## _move 유틸함수

###### # object 속성 값 애니매이션. 실제 값을 지정하지는 않음.
__.animator__: {
	set: ...
	stop: ...
	easings: ...
}
