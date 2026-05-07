package com.appradar.util

import android.util.Xml
import org.xmlpull.v1.XmlPullParser
import java.io.InputStream

data class GpxData(
    val trackPoints: List<GpxPoint>,
    val waypoints: List<GpxPoint>
)

data class GpxPoint(val latitude: Double, val longitude: Double, val name: String? = null)

object GpxParser {
    fun parse(inputStream: InputStream): GpxData {
        val trackPoints = mutableListOf<GpxPoint>()
        val waypoints = mutableListOf<GpxPoint>()
        val parser = Xml.newPullParser()
        parser.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES, false)
        parser.setInput(inputStream, null)
        
        var eventType = parser.eventType
        while (eventType != XmlPullParser.END_DOCUMENT) {
            if (eventType == XmlPullParser.START_TAG) {
                val tagName = parser.name
                if (tagName == "trkpt" || tagName == "wpt") {
                    val lat = parser.getAttributeValue(null, "lat").toDouble()
                    val lon = parser.getAttributeValue(null, "lon").toDouble()
                    var name: String? = null
                    
                    val isWaypoint = tagName == "wpt"
                    
                    var innerEvent = parser.next()
                    while (!(innerEvent == XmlPullParser.END_TAG && parser.name == tagName)) {
                        if (innerEvent == XmlPullParser.START_TAG && parser.name == "name") {
                            name = parser.nextText()
                        }
                        innerEvent = parser.next()
                    }
                    
                    val point = GpxPoint(lat, lon, name)
                    if (isWaypoint) waypoints.add(point) else trackPoints.add(point)
                }
            }
            eventType = parser.next()
        }
        return GpxData(trackPoints, waypoints)
    }
}
