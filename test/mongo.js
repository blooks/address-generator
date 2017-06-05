import randomstring from 'randomstring'
export default `mongodb://localhost/${randomstring.generate(7)}`
