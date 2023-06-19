package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"io"
	"log"
	"time"
)

func GetSecretKey() *[32]byte {
	key, err := hex.DecodeString("3e367a60ddc0699ea2f486717d5dcd174c4dee0bcf1855065ab74c348e550b78")
	if err != nil {
		log.Fatal(err)
	}
	return (*[32]byte)(key)
}

func NewGCM(key *[32]byte) (gcm cipher.AEAD, err error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return
	}
	gcm, err = cipher.NewGCM(block)
	return
}

func randNonce(nonceSize int) []byte {
	nonce := make([]byte, nonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		panic(err)
	}
	return nonce
}

func Encrypt(plaintext []byte, gcm cipher.AEAD) []byte {
	// 随机生成字节 slice，使得每次的加密结果具有随机性
	nonce := randNonce(gcm.NonceSize())
	// Seal 方法第一个参数 nonce，会把 nonce 本身加入到加密结果
	return gcm.Seal(nonce, nonce, plaintext, nil)
}

func Decrypt(ciphertext []byte, gcm cipher.AEAD) ([]byte, error) {
	// 首先得到加密时使用的 nonce
	nonce := ciphertext[:gcm.NonceSize()]
	// 传入 nonce 并进行数据解密
	return gcm.Open(nil, nonce, ciphertext[gcm.NonceSize():], nil)
}

// 应该用 User ID 生成 Token
func GenerateToken(username string) (token string, err error) {
	gcm, err := NewGCM(GetSecretKey())
	if err != nil {
		return
	}

	bytes := make([]byte, len(username)+8)
	binary.BigEndian.PutUint64(bytes, uint64(time.Now().Unix()))
	copy(bytes[8:], []byte(username))
	token = base64.StdEncoding.EncodeToString(Encrypt(bytes, gcm))
	return
}

// 解析 Token
func ParseToken(token string) (username string, expired bool, err error) {
	gcm, err := NewGCM(GetSecretKey())
	if err != nil {
		return
	}

	tokenBytes, _ := base64.StdEncoding.DecodeString(token)
	bytes, err := Decrypt(tokenBytes, gcm)
	if err != nil {
		return
	}

	genTime := binary.BigEndian.Uint64(bytes)
	expired = time.Since(time.Unix(int64(genTime), 0)) > 30*24*time.Hour
	username = string(bytes[8:])
	return
}
