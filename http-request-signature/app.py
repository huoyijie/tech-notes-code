from flask import Flask, request, abort

from http_message_signatures import HTTPMessageVerifier, algorithms
from app_key import MyHTTPSignatureKeyResolver

verifier = HTTPMessageVerifier(signature_algorithm=algorithms.HMAC_SHA256, key_resolver=MyHTTPSignatureKeyResolver())

app = Flask(__name__)

@app.route('/hello/<greeting>', methods=['POST'])
def hello(greeting):
  try:
    print(request.headers)
    verifyReuslt = verifier.verify(request)
    print(verifyReuslt)
    # todo 验证 body 与 content-digest 一致
  except Exception as e:
    print(e)
    abort(400)

  return 'hello, %s | HELLO, %s!' %(greeting, request.json['HELLO'])

@app.errorhandler(400)
def bad_request(error):
  return 'Bad Request', 400
