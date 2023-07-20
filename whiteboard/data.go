package main

// 注意使用了 msgpack 标签注解序列化后的字段名
type Drawing struct {
	X0 int `msgpack:"x0"`
	Y0 int `msgpack:"y0"`
	X1 int `msgpack:"x1"`
	Y1 int `msgpack:"y1"`
}

type Drawings struct {
	From string
	Data []Drawing
}
