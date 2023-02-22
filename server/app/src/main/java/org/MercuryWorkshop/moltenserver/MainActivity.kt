package org.MercuryWorkshop.moltenserver

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import org.json.JSONObject
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.util.*

class MainActivity() : AppCompatActivity() {
    private val buttonStartReceiving: Button? = null
    private val buttonStopReceiving: Button? = null
    private var textViewDataFromClient: TextView? = null
    val handler = Handler()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        textViewDataFromClient = findViewById<View>(R.id.textViewDataFromClient) as TextView
        if ((ContextCompat.checkSelfPermission(this, Manifest.permission.MANAGE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED)
        ) {
            ActivityCompat.requestPermissions(
                this, arrayOf(Manifest.permission.MANAGE_EXTERNAL_STORAGE),
                1
            )
            Log.e("MoltenServer", "jsakd")
        } else {
            Log.e("MoltenServer", "ASDJKASDL")
        }
        //        Thread thread = new Thread(new Runnable() {
//
//            OkHttpClient client = new OkHttpClient();
//            URL url = null;
//            @Override
//            public void run() {
//                try {
//                    url = new URL("https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png");
//                } catch (
//                        MalformedURLException e) {
//                    throw new RuntimeException(e);
//                }
//
//                Request req = new Request.Builder().url(url).build();
//                try (
//                        Response httpResp = client.newCall(req).execute()) {
//
//
//                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
//                        byte[] b = httpResp.body().source().readByteArray();
////                        byte[] body = httpResp.body().bytes();
////                        body.toString();
////                        String read = httpResp.body().source().readUtf8();
////
////                        ByteArrayOutputStream bOut = new ByteArrayOutputStream();
////
////                        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(new FileOutputStream("/storage/emulated/0/Documents/fuck.png"), "utf8"));
////
////                        bw.write(Base64.getMimeEncoder().encodeToString(b));
//                        bw.close();
//                    }
//                } catch (
//                        IOException e) {
//                    throw new RuntimeException(e);
//                }
//            }
//        });
//        thread.start();
        startServerSocket()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1) {
            if ((grantResults.size > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED)
            ) {
                Log.d("MoltenServer", "thranted??/")
                // Permission granted, do your work
            } else {
                Log.d("MoltenServer", "asdjaskldjklas")
                //                Log.d("MoltenServer",permissions);
            }
        }
    }

    private fun listenToClient(sock: Socket) {
        val thread = Thread(object : Runnable {
            private var end = false
            private var stringData: String? = null
            var client = OkHttpClient().newBuilder()
                .followRedirects(false)
                .followSslRedirects(false)
                .build()

            @RequiresApi(Build.VERSION_CODES.O)
            override fun run() {
                try {
                    val input = BufferedReader(InputStreamReader(sock.getInputStream()))
                    val output = PrintWriter(sock.getOutputStream())
                    while (!end) {
//                        output.println("CONNECTION");
                        stringData = input.readLine()
                        if (stringData == null) {
                            end = true
                            return
                        }
                        try {
                            val request = JSONObject(stringData)
                            val reqHeaders = request.getJSONObject("headers")
                            val url = URL(request.getString("url"))
                            val builder = Request.Builder().url(url)
                            if (!request.getString("method").equals("get", ignoreCase = true)) {
                                Log.d("MoltenServer", request.getString("method"))
                                builder.method(
                                    request.getString("method"), RequestBody.create(
                                        MediaType.parse(reqHeaders.getString("Content-Type")),
                                        request.getString("body")
                                    )
                                )
                            }
                            val it = reqHeaders.keys()
                            while (it.hasNext()) {
                                val key = it.next()
                                if (key != "Authorization") {
                                    builder.header(key, reqHeaders.getString(key))
                                }
                            }
                            val httpreq = builder.build()
                            try {
                                client.newCall(httpreq).execute().use { httpResp ->
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                        val body: ByteArray =
                                            httpResp.body()!!.source().readByteArray()
                                        val resp: JSONObject = JSONObject()
                                        resp.put("id", request.getString("id"))
                                        resp.put(
                                            "data",
                                            Base64.getMimeEncoder().encodeToString(body)
                                        )
                                        val headers: JSONObject = JSONObject()
                                        val it: Iterator<String> =
                                            httpResp.headers().toMultimap().keys.iterator()
                                        while (it.hasNext()) {
                                            val key: String = it.next()
                                            headers.put(key, httpResp.header(key))
                                        }
                                        resp.put("status", httpResp.code())
                                        resp.put("headers", headers)
                                        output.println(resp.toString() + "\u0004")
                                    }
                                }
                            }catch (e: Exception){
                                val resp: JSONObject = JSONObject()
                                resp.put("id", request.getString("id"))
                                resp.put(
                                    "error",
                                    Base64.getMimeEncoder().encodeToString(e.toString().toByteArray())
                                )
                                output.println(resp.toString() + "\u0004")
                            }
                        } catch (e: Exception) {
                            Log.d("MoltenServer", e.toString())
                        }
                        Log.e("MoltenServer", (":EOL".let { stringData += it; stringData })!!)
                        output.flush()
                        //                        android.os.Process.killProcess(android.os.Process.myPid());


//                        try {
//                            Thread.sleep(1000);
//                        } catch (InterruptedException e) {
//                            e.printStackTrace();
//                        }

                        //output.
                        updateUI(stringData!!)
                        if (stringData.equals("STOP", ignoreCase = true)) {
                            end = true
                            output.close()
                            try {
                                sock.close()
                            } catch (e: IOException) {
                                throw RuntimeException(e)
                            }
                            break
                        }
                    }
                    output.close()
                    sock.close()
                } catch (e: IOException) {
                    throw RuntimeException(e)
                }
            }
        })
        thread.start()
    }

    private fun startServerSocket() {
        val thread = Thread(object : Runnable {
            private val stringData: String? = null
            override fun run() {
                try {
                    val ss = ServerSocket(1234)
                    while (true) {
                        //Server is waiting for client here, if needed
                        val s = ss.accept()
                        listenToClient(s)
                    }
                } catch (e: IOException) {
                    e.printStackTrace()
                }
            }
        })
        thread.start()
    }

    private fun updateUI(stringData: String) {
        handler.post(Runnable {
            val s = textViewDataFromClient!!.text.toString()
            if (stringData.trim { it <= ' ' }.length != 0) textViewDataFromClient!!.text =
                "$s\nFrom Client : $stringData"
        })
    }
}