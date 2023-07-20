package main

// 注意使用了 msgpack 标签注解序列化后的字段名
type Drawing struct {
	X0 float64 `msgpack:"x0"`
	Y0 float64 `msgpack:"y0"`
	X1 float64 `msgpack:"x1"`
	Y1 float64 `msgpack:"y1"`
}

type Drawings struct {
	From string
	Data []Drawing
}
